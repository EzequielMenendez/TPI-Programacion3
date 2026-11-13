const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function crearEntornoCatalogo(responder) {
  const peticiones = [];
  const listenersDocumento = {};
  const campos = new Map();

  const crearElemento = (tag = 'div') => ({
    tag,
    id: '',
    className: '',
    textContent: '',
    value: '',
    disabled: false,
    hidden: false,
    dataset: {},
    hijos: [],
    listeners: {},
    classList: {
      clases: new Set(),
      add(...nombres) { nombres.forEach(n => this.clases.add(n)); },
      remove(...nombres) { nombres.forEach(n => this.clases.delete(n)); },
      contains(n) { return this.clases.has(n); },
    },
    append(...hijos) { this.hijos.push(...hijos); },
    replaceChildren(...hijos) { this.hijos = hijos; },
    setAttribute() {},
    removeAttribute() {},
    addEventListener(nombre, fn) { this.listeners[nombre] = fn; },
    focus() {},
  });

  const nodo = (id) => {
    if (!campos.has(id)) {
      const el = crearElemento();
      el.id = id;
      if (id === 'catalogo-limit') el.value = '20';
      campos.set(id, el);
    }
    return campos.get(id);
  };

  for (const id of [
    'buscador-form',
    'busqueda-titulo',
    'limpiar-busqueda',
    'catalogo-limit',
    'catalogo-anterior',
    'catalogo-siguiente',
    'catalogo-pagina',
    'catalogo-mensaje',
    'catalogo-lista',
  ]) {
    nodo(id);
  }

  const sandbox = vm.createContext({
    console,
    Intl,
    URLSearchParams,
    CustomEvent: class { constructor(type, opciones) { this.type = type; this.detail = opciones?.detail; } },
    document: {
      getElementById: (id) => campos.get(id) ?? null,
      createElement: crearElemento,
      addEventListener(nombre, fn) { listenersDocumento[nombre] = fn; },
      dispatchEvent(evento) { listenersDocumento[evento.type]?.(evento); },
    },
    fetch: async (url, configuracion) => {
      const peticion = { url, metodo: configuracion.method };
      peticiones.push(peticion);
      const respuesta = await responder(peticion);
      if (respuesta === 'sin-conexion') throw new TypeError('Failed to fetch');
      const [status, cuerpo] = respuesta;
      return { ok: status >= 200 && status < 300, status, json: async () => cuerpo };
    },
  });

  for (const archivo of ['datos', 'utilidades', 'api', 'catalogo']) {
    const ruta = path.join(__dirname, '..', 'js', archivo + '.js');
    vm.runInContext(fs.readFileSync(ruta, 'utf8'), sandbox, { filename: ruta });
  }

  return {
    peticiones,
    nodo,
    listenersDocumento,
    run(codigo) { return vm.runInContext(codigo, sandbox); },
    iniciar() { return vm.runInContext('iniciarCatalogo()', sandbox); },
  };
}

const LIBROS_API = [
  {
    id: 1,
    isbn: '978-950-000-001-1',
    titulo: 'El viento del Aconcagua',
    precio: '12500.00',
    stock: 8,
    editorial: { id: 1, nombre: 'Editorial Cordillera', pais: 'Argentina' },
    genero: { id: 1, nombre: 'Novela' },
  },
  {
    id: 4,
    isbn: '978-950-000-004-2',
    titulo: 'Cuaderno de viaje',
    precio: '9800.50',
    stock: 3,
    editorial: { id: 2, nombre: 'Ediciones del Sur', pais: 'Argentina' },
    genero: null,
  },
];

const DETALLE_LIBRO_4 = {
  ...LIBROS_API[1],
  autores: [
    { autor_id: 2, nombre: 'Martín Vera', rol: 'ilustrador', orden: 2 },
    { autor_id: 1, nombre: 'Clara Ibarra', rol: 'autor', orden: 1 },
  ],
};

function buscarEnArbol(raiz, predicado) {
  if (predicado(raiz)) return raiz;
  for (const hijo of raiz.hijos || []) {
    if (hijo && typeof hijo === 'object') {
      const hallado = buscarEnArbol(hijo, predicado);
      if (hallado) return hallado;
    }
  }
  return null;
}

function textoPlano(raiz) {
  if (!raiz || typeof raiz !== 'object') return String(raiz ?? '');
  const propio = raiz.textContent || '';
  const deHijos = (raiz.hijos || []).map(textoPlano).join(' ');
  return `${propio} ${deHijos}`.trim();
}

test('E1 (2.1): construirParametrosCatalogo valida limit, offset y recorta titulo', () => {
  const env = crearEntornoCatalogo(() => [200, []]);
  assert.deepEqual(
    JSON.parse(env.run('JSON.stringify(construirParametrosCatalogo({ titulo: "  ", limit: 20, offset: 0 }))')),
    { limit: 20, offset: 0 }
  );
  assert.deepEqual(
    JSON.parse(env.run('JSON.stringify(construirParametrosCatalogo({ titulo: "  Viento ", limit: 5, offset: 10 }))')),
    { limit: 5, offset: 10, titulo: 'Viento' }
  );
  assert.deepEqual(
    JSON.parse(env.run('JSON.stringify(construirParametrosCatalogo({ titulo: "", limit: 999, offset: -4 }))')),
    { limit: 20, offset: 0 }
  );
});

test('E1 (2.1): carga inicial con limit=20&offset=0, paginación y reinicio de offset al cambiar filtro', async () => {
  const pagina1 = [LIBROS_API[0], LIBROS_API[1]];
  const pagina2 = [{ ...LIBROS_API[0], id: 9, titulo: 'Libro página 2' }];
  const env = crearEntornoCatalogo(({ url }) => {
    if (url === '/api/libros/?limit=2&offset=0') return [200, pagina1];
    if (url === '/api/libros/?limit=2&offset=2') return [200, pagina2];
    if (url === '/api/libros/?limit=2&offset=0&titulo=viento') return [200, [LIBROS_API[0]]];
    return [200, LIBROS_API];
  });

  await env.iniciar();
  assert.equal(env.peticiones[0].url, '/api/libros/?limit=20&offset=0');

  // Cambiamos limit a 2 -> reinicia offset=0 y habilita "Página siguiente" porque devolvió 2 libros (= limit).
  env.nodo('catalogo-limit').value = '2';
  await env.nodo('catalogo-limit').listeners.change();
  assert.equal(env.peticiones.at(-1).url, '/api/libros/?limit=2&offset=0');
  assert.equal(env.nodo('catalogo-anterior').disabled, true);
  assert.equal(env.nodo('catalogo-siguiente').disabled, false);

  // Avanzamos a la página siguiente -> offset=2.
  await env.nodo('catalogo-siguiente').listeners.click();
  assert.equal(env.peticiones.at(-1).url, '/api/libros/?limit=2&offset=2');
  assert.equal(env.nodo('catalogo-anterior').disabled, false);
  assert.equal(env.nodo('catalogo-siguiente').disabled, true); // devolvió 1 < 2

  // Volvemos a la página anterior -> offset=0.
  await env.nodo('catalogo-anterior').listeners.click();
  assert.equal(env.peticiones.at(-1).url, '/api/libros/?limit=2&offset=0');
  assert.equal(env.nodo('catalogo-anterior').disabled, true);

  // Volvemos a avanzar a offset=2 y luego cambiamos el filtro -> reinicia offset a 0.
  await env.nodo('catalogo-siguiente').listeners.click();
  assert.equal(env.run('estadoCatalogo.offset'), 2);
  env.nodo('busqueda-titulo').value = '  viento  ';
  await env.nodo('buscador-form').listeners.submit({ preventDefault() {} });
  assert.equal(env.peticiones.at(-1).url, '/api/libros/?limit=2&offset=0&titulo=viento');
  assert.equal(env.run('estadoCatalogo.offset'), 0);

  // Limpiar búsqueda vacía el campo, reinicia offset=0 y pide sin titulo.
  await env.nodo('limpiar-busqueda').listeners.click();
  assert.equal(env.nodo('busqueda-titulo').value, '');
  assert.equal(env.peticiones.at(-1).url, '/api/libros/?limit=2&offset=0');
});

test('E1 (2.2): muestra título, ISBN, precio, editorial y «Sin clasificar», y diferencia los 4 estados', async () => {
  let resolverPendiente;
  let modo = 'pendiente';
  const env = crearEntornoCatalogo(() => {
    if (modo === 'pendiente') {
      return new Promise((res) => { resolverPendiente = res; });
    }
    if (modo === 'vacio') return [200, []];
    if (modo === 'error') return 'sin-conexion';
    return [200, LIBROS_API];
  });

  // 1) Estado de carga mientras espera la promesa.
  const promesaInicio = env.iniciar();
  assert.match(env.nodo('catalogo-mensaje').textContent, /Cargando/i);
  resolverPendiente([200, LIBROS_API]);
  await promesaInicio;

  // Tarjetas con editorial y con género nulo -> «Sin clasificar».
  assert.equal(env.nodo('catalogo-lista').hijos.length, 2);
  const textoTarjetaSinGenero = textoPlano(env.nodo('catalogo-lista').hijos[1]);
  assert.match(textoTarjetaSinGenero, /Cuaderno de viaje/);
  assert.match(textoTarjetaSinGenero, /978-950-000-004-2/);
  assert.match(textoTarjetaSinGenero, /Ediciones del Sur/);
  assert.match(textoTarjetaSinGenero, /Sin clasificar/);

  // 2) Lista vacía sin filtro.
  modo = 'vacio';
  await env.run('cargarCatalogo()');
  assert.equal(env.nodo('catalogo-lista').hijos.length, 0);
  assert.match(env.nodo('catalogo-mensaje').textContent, /Todavía no hay libros cargados/i);

  // 3) Búsqueda sin coincidencias.
  env.nodo('busqueda-titulo').value = 'zzzz';
  await env.nodo('buscador-form').listeners.submit({ preventDefault() {} });
  assert.match(env.nodo('catalogo-mensaje').textContent, /Sin resultados.*zzzz/);
  assert.equal(env.nodo('catalogo-mensaje').classList.contains('message--warning'), true);

  // 4) Error de conexión.
  modo = 'error';
  await env.run('cargarCatalogo()');
  assert.equal(env.nodo('catalogo-lista').hijos.length, 0);
  assert.match(env.nodo('catalogo-mensaje').textContent, /No se pudo conectar/);
  assert.equal(env.nodo('catalogo-mensaje').classList.contains('message--warning'), true);
});

test('E1 (2.3 y 3.1): consulta GET /libros/{id} para ver autores ordenados y recarga ante libros-actualizados', async () => {
  let fallaDetalle = false;
  const env = crearEntornoCatalogo(({ url }) => {
    if (url.startsWith('/api/libros/?')) return [200, LIBROS_API];
    if (url === '/api/libros/4') {
      return fallaDetalle ? [404, { detail: 'El libro no existe.' }] : [200, DETALLE_LIBRO_4];
    }
    return [404, { detail: 'No encontrado' }];
  });

  await env.iniciar();
  const tarjeta4 = env.nodo('catalogo-lista').hijos[1];
  const botonDetalle = buscarEnArbol(tarjeta4, (n) => n.tag === 'button');
  assert.ok(botonDetalle, 'Cada tarjeta debe tener botón para consultar GET /libros/{id}');

  await botonDetalle.listeners.click();
  assert.equal(env.peticiones.at(-1).url, '/api/libros/4');
  assert.match(textoPlano(tarjeta4), /Clara Ibarra \(autor\), Martín Vera \(ilustrador\)/);

  // Si GET /libros/{id} responde 404, informa el error sin vaciar el catálogo.
  fallaDetalle = true;
  await botonDetalle.listeners.click();
  assert.match(textoPlano(tarjeta4), /El libro no existe/);
  assert.equal(env.nodo('catalogo-lista').hijos.length, 2);

  // Evento libros-actualizados refresca el catálogo.
  const cantidadAntes = env.peticiones.length;
  await env.listenersDocumento['libros-actualizados']?.({ detail: { libro: LIBROS_API[0] } });
  assert.equal(env.peticiones.length, cantidadAntes + 1);
  assert.equal(env.peticiones.at(-1).url, '/api/libros/?limit=20&offset=0');
});
