const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

/*
 * Global E2: el submit, la validación y la llamada a la API son producción.
 * Los dobles son mínimos: un DOM de mentira y un fetch que responde lo que
 * cada prueba le indica, registrando las peticiones recibidas.
 */
function alta(tipo, datos, responder) {
  const eventos = [];
  const peticiones = [];
  const campos = new Map();
  const nodo = id => {
    if (!campos.has(id)) campos.set(id, {
      id, listeners: {}, hijos: [], textContent: '', value: '', disabled: false, hidden: false,
      replaceChildren(...hijos) { this.hijos = hijos; },
      focus() {},
      classList: { add() {}, remove() {} },
      setAttribute() {}, removeAttribute() {},
      addEventListener(nombre, fn) { this.listeners[nombre] = fn; },
      reset() { this.listeners.reset?.(); },
    });
    return campos.get(id);
  };
  const crearElemento = () => ({
    hijos: [], textContent: '', dataset: {}, classList: { add() {}, remove() {} },
    append(...hijos) { this.hijos.push(...hijos); }, replaceChildren(...hijos) { this.hijos = hijos; },
    setAttribute() {}, addEventListener() {},
  });
  const sandbox = vm.createContext({
    console, URLSearchParams,
    CustomEvent: class { constructor(type, opciones) { this.type = type; this.detail = opciones?.detail; } },
    document: {
      addEventListener() {}, getElementById: nodo, createElement: crearElemento, querySelectorAll: () => [],
      dispatchEvent(evento) { eventos.push(evento); },
    },
    FormData: class { get(campo) { return datos[campo]; } },
    fetch: async (url, configuracion) => {
      const peticion = { url, metodo: configuracion.method, cuerpo: configuracion.body ? JSON.parse(configuracion.body) : null };
      peticiones.push(peticion);
      const respuesta = responder(peticion);
      if (respuesta === 'sin-conexion') throw new TypeError('Failed to fetch');
      const [status, cuerpo] = respuesta;
      return { ok: status >= 200 && status < 300, status, json: async () => cuerpo };
    },
  });
  for (const archivo of ['datos', 'utilidades', 'api', 'catalogo', 'libros', 'clientes']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', archivo + '.js'), 'utf8'), sandbox);
  }
  const textoErrores = () => {
    const lista = nodo(tipo === 'libro' ? 'libros-errores' : 'clientes-errores').hijos[0];
    return lista ? lista.hijos.map(item => item.textContent) : [];
  };
  return {
    eventos, peticiones, nodo, textoErrores,
    run(codigo) { return vm.runInContext(codigo, sandbox); },
    iniciar() { return vm.runInContext(tipo === 'libro' ? 'iniciarAltaLibros()' : 'iniciarAltaClientes()', sandbox); },
    async enviar() {
      nodo('form-' + tipo).listeners.submit({ preventDefault() {} });
      await new Promise(resolver => setImmediate(resolver));
    },
  };
}

const LIBRO_OK = { titulo: 'Temporal', isbn: '978-950-000-010-3', precio: '1500.50', stock: '4', editorialId: '2', generoId: '' };
const LIBRO_CREADO = {
  id: 9, isbn: '978-950-000-010-3', titulo: 'Temporal', precio: '1500.50', stock: 4,
  editorial: { id: 2, nombre: 'Anagrama', pais: 'España' }, genero: null,
  autores: [{ autor_id: 1, nombre: 'Julio Cortázar', rol: 'autor', orden: 1 }],
};
const AUTORES = [{ id: 1, nombre: 'Julio Cortázar', nacionalidad: 'argentina' }, { id: 2, nombre: 'Ricardo Piglia', nacionalidad: 'argentina' }];
const listados = ({ url, metodo }) => {
  if (metodo !== 'GET') return null;
  if (url.startsWith('/api/autores/?')) return [200, AUTORES];
  return /\/(editoriales|generos|libros|clientes)\/\?/.test(url) ? [200, []] : null;
};

test('E2 (DD-01): al iniciar se cargan editoriales, géneros, autores y libros desde /api con barra final', async () => {
  const prueba = alta('libro', LIBRO_OK, peticion => listados(peticion));
  await prueba.iniciar();
  assert.deepEqual(prueba.peticiones.map(p => p.url).sort(), [
    '/api/autores/?limit=100&offset=0', '/api/editoriales/?limit=100&offset=0',
    '/api/generos/?limit=100&offset=0', '/api/libros/?limit=100&offset=0',
  ]);
  assert.equal(prueba.run('autoresDisponibles.length'), 2);
  assert.equal(prueba.nodo('libro-autores').hijos.length, 2);
  assert.deepEqual(prueba.textoErrores(), []);
});

test('E2 (DD-01): marcar un autor lo verifica con GET /autores/{id}; el orden es el de marcado', async () => {
  let existeAutor2 = true;
  const prueba = alta('libro', LIBRO_OK, peticion => listados(peticion)
    || (peticion.url === '/api/autores/1' ? [200, AUTORES[0]]
      : peticion.url === '/api/autores/2' && existeAutor2 ? [200, AUTORES[1]] : [404, { detail: 'El autor no existe.' }]));
  await prueba.iniciar();
  await prueba.run('alternarAutor(autoresDisponibles[1], true, "traductor")');
  await prueba.run('alternarAutor(autoresDisponibles[0], true, "autor")');
  assert.deepEqual(prueba.peticiones.filter(p => /\/autores\/\d/.test(p.url)).map(p => p.url), ['/api/autores/2', '/api/autores/1']);
  assert.equal(prueba.run('JSON.stringify(construirCuerpoLibro({titulo:"T",isbn:"1234567890",precioTexto:"1",stockTexto:"0",editorialId:"1",generoId:""}, autoriasLibro).autores)'),
    '[{"autor_id":2,"rol":"traductor","orden":1},{"autor_id":1,"rol":"autor","orden":2}]');
  // Desmarcar renumera; un autor borrado de la base (404) no se agrega.
  await prueba.run('alternarAutor(autoresDisponibles[1], false, "traductor")');
  existeAutor2 = false;
  await prueba.run('alternarAutor(autoresDisponibles[1], true, "autor")');
  assert.equal(prueba.run('JSON.stringify(autoriasLibro.map(a => a.autor_id))'), '[1]');
  assert.match(prueba.nodo('libro-autor-resultado').textContent, /Ricardo Piglia ya no existe/);
});

test('E2: alta válida de libro envía el contrato, usa el registro del 201 y notifica una vez', async () => {
  const prueba = alta('libro', LIBRO_OK, peticion => listados(peticion) || [201, LIBRO_CREADO]);
  await prueba.iniciar();
  prueba.run('autoriasLibro = [{autor_id:1,nombre:"Julio Cortázar",rol:"autor"}]');
  await prueba.enviar();
  const post = prueba.peticiones.find(p => p.metodo === 'POST');
  assert.equal(post.url, '/api/libros/');
  assert.deepEqual(post.cuerpo, {
    titulo: 'Temporal', isbn: '978-950-000-010-3', precio: '1500.50', stock: 4,
    editorial_id: 2, genero_id: null, autores: [{ autor_id: 1, rol: 'autor', orden: 1 }],
  });
  assert.equal(prueba.run('librosCargados.length'), 1);
  assert.equal(prueba.run('librosCargados[0].id'), 9);
  assert.equal(prueba.run('autoriasLibro.length'), 0);
  assert.deepEqual(prueba.eventos.map(e => e.type), ['libros-actualizados']);
  assert.equal(prueba.eventos[0].detail.libro.id, 9);
  assert.match(prueba.nodo('libros-mensaje').textContent, /id 9.*Julio Cortázar \(autor\)/);
  assert.equal(prueba.nodo('libro-enviar').disabled, false);
});

test('E2: un 409 de libro muestra el mensaje del servidor, no notifica y conserva las autorías', async () => {
  const prueba = alta('libro', LIBRO_OK, peticion => listados(peticion) || [409, { detail: 'Ya existe un libro con ese ISBN.' }]);
  await prueba.iniciar();
  prueba.run('autoriasLibro = [{autor_id:1,nombre:"Julio Cortázar",rol:"autor"}]');
  await prueba.enviar();
  assert.deepEqual(prueba.textoErrores(), ['Ya existe un libro con ese ISBN.']);
  assert.equal(prueba.eventos.length, 0);
  assert.equal(prueba.run('librosCargados.length'), 0);
  assert.equal(prueba.run('autoriasLibro.length'), 1);
  assert.equal(prueba.nodo('libro-enviar').disabled, false);
});

test('E2: un 422 de libro muestra cada mensaje del servidor con su campo', async () => {
  const detalle = [{ loc: ['body', 'isbn'], msg: 'Value error, ISBN inválido: solo dígitos y guiones (el último puede ser X).' }];
  const prueba = alta('libro', LIBRO_OK, peticion => listados(peticion) || [422, { detail: detalle }]);
  await prueba.iniciar();
  prueba.run('autoriasLibro = [{autor_id:1,nombre:"Julio Cortázar",rol:"autor"}]');
  await prueba.enviar();
  assert.deepEqual(prueba.textoErrores(), ['isbn: Value error, ISBN inválido: solo dígitos y guiones (el último puede ser X).']);
  assert.equal(prueba.eventos.length, 0);
});

test('E2: un libro inválido no llega a la API', async () => {
  const prueba = alta('libro', { ...LIBRO_OK, precio: '0' }, peticion => listados(peticion) || [201, LIBRO_CREADO]);
  await prueba.iniciar();
  await prueba.enviar();
  assert.equal(prueba.peticiones.filter(p => p.metodo === 'POST').length, 0);
  assert.equal(prueba.textoErrores().length, 2); // precio y falta de autores
});

test('E2: sin conexión se informa el error y no se notifica', async () => {
  const prueba = alta('cliente', { nombre: 'Temporal', email: 'nuevo@ejemplo.com' }, peticion => listados(peticion) || 'sin-conexion');
  await prueba.iniciar();
  await prueba.enviar();
  assert.match(prueba.textoErrores()[0], /No se pudo conectar/);
  assert.equal(prueba.eventos.length, 0);
});

test('E2: alta válida de cliente envía nombre y email, usa el 201 y notifica una vez', async () => {
  const creado = { id: 3, nombre: 'Temporal', email: 'nuevo@ejemplo.com', perfil: null };
  const prueba = alta('cliente', { nombre: ' Temporal ', email: 'Nuevo@Ejemplo.com' }, peticion => listados(peticion) || [201, creado]);
  await prueba.iniciar();
  await prueba.enviar();
  const post = prueba.peticiones.find(p => p.metodo === 'POST');
  assert.equal(post.url, '/api/clientes/');
  assert.deepEqual(post.cuerpo, { nombre: 'Temporal', email: 'Nuevo@Ejemplo.com' });
  assert.equal(prueba.run('clientesCargados.length'), 1);
  assert.deepEqual(prueba.eventos.map(e => e.type), ['clientes-actualizados']);
  assert.equal(prueba.eventos[0].detail.cliente.id, 3);
  assert.match(prueba.nodo('clientes-mensaje').textContent, /id 3 \(nuevo@ejemplo\.com\)/);
});

test('E2: email repetido (409) muestra el mensaje del servidor y no notifica', async () => {
  const prueba = alta('cliente', { nombre: 'Temporal', email: 'nuevo@ejemplo.com' }, peticion => listados(peticion) || [409, { detail: 'Ya existe un cliente con ese email.' }]);
  await prueba.iniciar();
  await prueba.enviar();
  assert.deepEqual(prueba.textoErrores(), ['Ya existe un cliente con ese email.']);
  assert.equal(prueba.eventos.length, 0);
  assert.equal(prueba.run('clientesCargados.length'), 0);
});

test('E2: buscar cliente por ID usa GET /clientes/{id} y muestra su nombre', async () => {
  const prueba = alta('cliente', {}, peticion => listados(peticion)
    || (peticion.url === '/api/clientes/2' ? [200, { id: 2, nombre: 'Bruno Pérez', email: 'bruno@ejemplo.com', perfil: null }] : [404, { detail: 'El cliente no existe.' }]));
  await prueba.iniciar();
  prueba.nodo('cliente-buscar-id').value = '2';
  await prueba.run('buscarClientePorId()');
  assert.match(prueba.nodo('cliente-buscar-resultado').textContent, /Cliente 2: Bruno Pérez/);
  prueba.nodo('cliente-buscar-id').value = '99';
  await prueba.run('buscarClientePorId()');
  assert.match(prueba.nodo('cliente-buscar-resultado').textContent, /No existe un cliente con el ID 99/);
  prueba.nodo('cliente-buscar-id').value = 'abc';
  const antes = prueba.peticiones.length;
  await prueba.run('buscarClientePorId()');
  assert.equal(prueba.peticiones.length, antes);
});
