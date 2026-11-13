const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function crearEntornoVentas(responder) {
  const peticiones = [];
  const eventosDespachados = [];
  const listenersDocumento = {};
  const campos = new Map();

  const crearElemento = (tag = 'div') => ({
    tag,
    id: '',
    className: '',
    textContent: '',
    value: '',
    type: '',
    disabled: false,
    hidden: false,
    tabIndex: 0,
    dataset: {},
    atributos: {},
    hijos: [],
    listeners: {},
    classList: {
      clases: new Set(),
      add(...nombres) { nombres.forEach((n) => this.clases.add(n)); },
      remove(...nombres) { nombres.forEach((n) => this.clases.delete(n)); },
      contains(n) { return this.clases.has(n); },
    },
    append(...hijos) { this.hijos.push(...hijos); },
    replaceChildren(...hijos) { this.hijos = hijos; },
    setAttribute(nombre, valor) { this.atributos[nombre] = String(valor); },
    removeAttribute(nombre) { delete this.atributos[nombre]; },
    getAttribute(nombre) { return this.atributos[nombre] ?? null; },
    addEventListener(nombre, fn) { this.listeners[nombre] = fn; },
    querySelector(selector) {
      if (selector === '.cantidad-renglon') {
        return buscarEnArbol(this, (n) => String(n.className || '').includes('cantidad-renglon'));
      }
      if (selector === '.precio-renglon') {
        return buscarEnArbol(this, (n) => String(n.className || '').includes('precio-renglon'));
      }
      if (selector === '.subtotal-renglon') {
        return buscarEnArbol(this, (n) => String(n.className || '').includes('subtotal-renglon'));
      }
      return null;
    },
    focus() {},
  });

  const nodo = (id) => {
    if (!campos.has(id)) {
      const el = crearElemento();
      el.id = id;
      if (id === 'venta-cantidad') el.value = '1';
      if (id === 'historial-limit') el.value = '20';
      campos.set(id, el);
    }
    return campos.get(id);
  };

  for (const id of [
    'form-venta',
    'venta-cliente',
    'venta-libro',
    'venta-cantidad',
    'venta-agregar',
    'venta-vacio',
    'venta-cuerpo',
    'venta-total',
    'venta-confirmar',
    'ventas-errores',
    'ventas-mensaje',
    'historial-limit',
    'historial-anterior',
    'historial-siguiente',
    'historial-pagina',
    'historial-errores',
    'historial-vacio',
    'historial-cuerpo',
    'historial-detalle',
  ]) {
    nodo(id);
  }

  const sandbox = vm.createContext({
    console,
    Intl,
    URLSearchParams,
    CustomEvent: class {
      constructor(type, opciones) {
        this.type = type;
        this.detail = opciones?.detail;
      }
    },
    document: {
      getElementById: (id) => campos.get(id) ?? null,
      createElement: crearElemento,
      querySelectorAll(selector) {
        if (selector === '#venta-cuerpo tr') {
          return nodo('venta-cuerpo').hijos;
        }
        if (selector === '#venta-cuerpo .cantidad-renglon') {
          return nodo('venta-cuerpo').hijos
            .map((fila) => fila.querySelector('.cantidad-renglon'))
            .filter(Boolean);
        }
        return [];
      },
      addEventListener(nombre, fn) {
        if (!listenersDocumento[nombre]) listenersDocumento[nombre] = [];
        listenersDocumento[nombre].push(fn);
      },
      dispatchEvent(evento) {
        eventosDespachados.push(evento);
        (listenersDocumento[evento.type] || []).forEach((fn) => fn(evento));
      },
    },
    fetch: async (url, configuracion) => {
      const peticion = {
        url,
        metodo: configuracion.method,
        cuerpo: configuracion.body ? JSON.parse(configuracion.body) : null,
      };
      peticiones.push(peticion);
      const respuesta = await responder(peticion);
      if (respuesta === 'sin-conexion') throw new TypeError('Failed to fetch');
      const [status, cuerpo] = respuesta;
      return { ok: status >= 200 && status < 300, status, json: async () => cuerpo };
    },
  });

  for (const archivo of ['datos', 'utilidades', 'api', 'catalogo', 'ventas-modelo', 'ventas']) {
    const ruta = path.join(__dirname, '..', 'js', archivo + '.js');
    vm.runInContext(fs.readFileSync(ruta, 'utf8'), sandbox, { filename: ruta });
  }

  const textoErrores = (idContenedor = 'ventas-errores') => {
    const lista = nodo(idContenedor).hijos[0];
    return lista ? lista.hijos.map((item) => item.textContent) : [];
  };

  return {
    peticiones,
    eventosDespachados,
    listenersDocumento,
    nodo,
    textoErrores,
    run(codigo) { return vm.runInContext(codigo, sandbox); },
    iniciar() { return vm.runInContext('iniciarVentas()', sandbox); },
  };
}

function buscarEnArbol(raiz, predicado) {
  if (!raiz || typeof raiz !== 'object') return null;
  if (predicado(raiz)) return raiz;
  for (const hijo of raiz.hijos || []) {
    const hallado = buscarEnArbol(hijo, predicado);
    if (hallado) return hallado;
  }
  return null;
}

function textoPlano(raiz) {
  if (!raiz || typeof raiz !== 'object') return String(raiz ?? '');
  const propio = raiz.textContent || '';
  const deHijos = (raiz.hijos || []).map(textoPlano).join(' ');
  return `${propio} ${deHijos}`.trim();
}

const CLIENTES_API = [
  { id: 1, nombre: 'Ana Gómez', email: 'ana@ejemplo.com', perfil: null },
  { id: 2, nombre: 'Bruno Pérez', email: 'bruno@ejemplo.com', perfil: null },
];

const LIBROS_API = [
  {
    id: 10,
    isbn: '978-950-000-001-1',
    titulo: 'Rayuela',
    precio: '18500.00',
    stock: 5,
    editorial: { id: 1, nombre: 'Sudamericana', pais: 'Argentina' },
    genero: { id: 1, nombre: 'Novela' },
  },
  {
    id: 20,
    isbn: '978-950-000-002-8',
    titulo: 'Ficciones',
    precio: '12000.50',
    stock: 3,
    editorial: { id: 1, nombre: 'Sur', pais: 'Argentina' },
    genero: { id: 2, nombre: 'Cuento' },
  },
];

const VENTA_CREADA = {
  id: 15,
  fecha: '2026-11-13T19:00:00Z',
  total: '49000.50',
  cliente: { id: 1, nombre: 'Ana Gómez', email: 'ana@ejemplo.com' },
  renglones: [
    { libro_id: 10, titulo: 'Rayuela', cantidad: 2, precio_unitario: '18500.00', subtotal: '37000.00' },
    { libro_id: 20, titulo: 'Ficciones', cantidad: 1, precio_unitario: '12000.50', subtotal: '12000.50' },
  ],
};

test('E3 (2.1): carga selectores desde GET /api/clientes/ y GET /api/libros/ y los actualiza sin perder el borrador', async () => {
  const env = crearEntornoVentas(({ url }) => {
    if (url.startsWith('/api/clientes/?')) return [200, CLIENTES_API];
    if (url.startsWith('/api/libros/?')) return [200, LIBROS_API];
    if (url.startsWith('/api/ventas/?')) return [200, []];
    return [404, { detail: 'No encontrado' }];
  });

  await env.iniciar();

  const urlsIniciales = env.peticiones.map((p) => p.url);
  assert.ok(urlsIniciales.includes('/api/clientes/?limit=100&offset=0'));
  assert.ok(urlsIniciales.includes('/api/libros/?limit=100&offset=0'));
  assert.ok(urlsIniciales.includes('/api/ventas/?limit=20&offset=0'));

  // Opciones iniciales incluyen opción por defecto + registros de la API.
  assert.equal(env.nodo('venta-cliente').hijos.length, 3);
  assert.equal(env.nodo('venta-libro').hijos.length, 3);

  // Seleccionamos cliente y agregamos un renglón al borrador.
  env.nodo('venta-cliente').value = '1';
  env.nodo('venta-cliente').listeners.change();
  env.nodo('venta-libro').value = '10';
  env.nodo('venta-cantidad').value = '2';
  env.nodo('venta-agregar').listeners.click();
  assert.equal(env.nodo('venta-cuerpo').hijos.length, 1);

  // Al dispararse clientes-actualizados y libros-actualizados se agregan opciones sin vaciar el borrador.
  env.run('document.dispatchEvent(new CustomEvent("clientes-actualizados", { detail: { cliente: { id: 3, nombre: "Carla Sosa", email: "carla@ejemplo.com" } } }))');
  env.run('document.dispatchEvent(new CustomEvent("libros-actualizados", { detail: { libro: { id: 30, titulo: "El Aleph", isbn: "978-950-000-003-5", precio: "15000.00", stock: 4 } } }))');

  assert.equal(env.nodo('venta-cliente').hijos.length, 4);
  assert.equal(env.nodo('venta-libro').hijos.length, 4);
  assert.equal(env.nodo('venta-cliente').value, '1');
  assert.equal(env.nodo('venta-cuerpo').hijos.length, 1);
  assert.equal(env.run('borradorVenta.renglones[0].cantidad'), 2);
});

test('E3 (2.2): armar venta, confirmar con POST /api/ventas/ (201), mostrar importes devueltos y limpiar borrador', async () => {
  let resolverPost;
  const env = crearEntornoVentas(({ url, metodo }) => {
    if (url.startsWith('/api/clientes/?')) return [200, CLIENTES_API];
    if (url.startsWith('/api/libros/?')) return [200, LIBROS_API];
    if (url.startsWith('/api/ventas/?')) return [200, [VENTA_CREADA]];
    if (url === '/api/ventas/' && metodo === 'POST') {
      return new Promise((res) => { resolverPost = res; });
    }
    return [404, { detail: 'No encontrado' }];
  });

  await env.iniciar();

  env.nodo('venta-cliente').value = '1';
  env.nodo('venta-cliente').listeners.change();

  // Agregamos libro 10 con cantidad 1 y luego cambiamos cantidad a 2 en el renglón.
  env.nodo('venta-libro').value = '10';
  env.nodo('venta-cantidad').value = '1';
  env.nodo('venta-agregar').listeners.click();
  assert.equal(env.nodo('venta-cuerpo').hijos.length, 1);

  // Intento de agregar libro repetido (10) -> rechazado sin duplicar renglón.
  env.nodo('venta-libro').value = '10';
  env.nodo('venta-cantidad').value = '3';
  env.nodo('venta-agregar').listeners.click();
  assert.equal(env.nodo('venta-cuerpo').hijos.length, 1);
  assert.match(env.textoErrores().join(' '), /ya está en la venta/);

  // Modificamos cantidad en la fila del libro 10 a 2.
  const inputCantidadFila1 = env.nodo('venta-cuerpo').hijos[0].querySelector('.cantidad-renglon');
  inputCantidadFila1.value = '2';
  inputCantidadFila1.listeners.change();

  // Agregamos segundo libro (20) con cantidad 1.
  env.nodo('venta-libro').value = '20';
  env.nodo('venta-cantidad').value = '1';
  env.nodo('venta-agregar').listeners.click();
  assert.equal(env.nodo('venta-cuerpo').hijos.length, 2);

  // Enviamos la venta: verificamos que el botón se deshabilita mientras está en curso.
  const promesaEnvio = env.nodo('form-venta').listeners.submit({ preventDefault() {} });
  assert.equal(env.nodo('venta-confirmar').disabled, true);

  resolverPost([201, VENTA_CREADA]);
  await promesaEnvio;
  await new Promise((r) => setImmediate(r));

  assert.equal(env.nodo('venta-confirmar').disabled, false);

  const post = env.peticiones.find((p) => p.metodo === 'POST' && p.url === '/api/ventas/');
  assert.ok(post, 'Debe enviar POST /api/ventas/');
  assert.deepEqual(post.cuerpo, {
    cliente_id: 1,
    renglones: [
      { libro_id: 10, cantidad: 2 },
      { libro_id: 20, cantidad: 1 },
    ],
  });
  assert.deepEqual(Object.keys(post.cuerpo), ['cliente_id', 'renglones']);
  assert.deepEqual(Object.keys(post.cuerpo.renglones[0]), ['libro_id', 'cantidad']);

  // El borrador se limpió tras el 201.
  assert.equal(env.run('borradorVenta.clienteId'), '');
  assert.equal(env.run('borradorVenta.renglones.length'), 0);
  assert.equal(env.nodo('venta-cuerpo').hijos.length, 0);

  // El mensaje de confirmación muestra precios unitarios, subtotales y total de la respuesta 201.
  const mensaje = env.nodo('ventas-mensaje').textContent;
  assert.match(mensaje, /Venta #15/);
  assert.match(mensaje, /Ana Gómez/);
  assert.match(mensaje, /18\.500,00/);
  assert.match(mensaje, /37\.000,00/);
  assert.match(mensaje, /49\.000,50/);

  // Se despachó el evento ventas-actualizadas.
  assert.ok(env.eventosDespachados.some((e) => e.type === 'ventas-actualizadas'));
});

test('E3 (2.2 · Caso G-07): ante 409 (stock insuficiente o cliente/libro inexistente) o 422 conserva intacto el borrador', async () => {
  let respuestaPost = [409, { detail: "Stock insuficiente para el libro 'Rayuela' (id 10): disponible 5, solicitado 9." }];
  const env = crearEntornoVentas(({ url, metodo }) => {
    if (url.startsWith('/api/clientes/?')) return [200, CLIENTES_API];
    if (url.startsWith('/api/libros/?')) return [200, LIBROS_API];
    if (url.startsWith('/api/ventas/?')) return [200, []];
    if (url === '/api/ventas/' && metodo === 'POST') return respuestaPost;
    return [404, { detail: 'No encontrado' }];
  });

  await env.iniciar();

  env.nodo('venta-cliente').value = '1';
  env.nodo('venta-cliente').listeners.change();
  env.nodo('venta-libro').value = '10';
  env.nodo('venta-cantidad').value = '9';
  env.nodo('venta-agregar').listeners.click();

  await env.nodo('form-venta').listeners.submit({ preventDefault() {} });

  assert.deepEqual(env.textoErrores(), [
    "Stock insuficiente para el libro 'Rayuela' (id 10): disponible 5, solicitado 9.",
  ]);
  assert.equal(env.run('borradorVenta.clienteId'), '1');
  assert.equal(env.run('borradorVenta.renglones.length'), 1);
  assert.equal(env.run('borradorVenta.renglones[0].cantidad'), 9);
  assert.equal(env.nodo('venta-cuerpo').hijos.length, 1);

  // Probamos también rechazo 422 del servidor -> conserva el borrador.
  respuestaPost = [422, { detail: [{ loc: ['body', 'renglones'], msg: 'No se puede repetir el mismo libro en una venta.' }] }];
  await env.nodo('form-venta').listeners.submit({ preventDefault() {} });
  assert.deepEqual(env.textoErrores(), ['renglones: No se puede repetir el mismo libro en una venta.']);
  assert.equal(env.run('borradorVenta.renglones.length'), 1);
  assert.equal(env.nodo('venta-cuerpo').hijos.length, 1);
});

test('E3 (3.1 · Caso G-06): historial con limit/offset, detalle GET /api/ventas/{id} e inmutabilidad tras cambio de precio', async () => {
  let precioActualCatalogo = '18500.00';
  const ventaHistorica = {
    id: 42,
    fecha: '2026-11-13T15:00:00Z',
    total: '37000.00',
    cliente: { id: 1, nombre: 'Ana Gómez', email: 'ana@ejemplo.com' },
    renglones: [
      { libro_id: 10, titulo: 'Rayuela', cantidad: 2, precio_unitario: '18500.00', subtotal: '37000.00' },
    ],
  };

  const env = crearEntornoVentas(({ url }) => {
    if (url.startsWith('/api/clientes/?')) return [200, CLIENTES_API];
    if (url.startsWith('/api/libros/?')) {
      return [200, [{ ...LIBROS_API[0], precio: precioActualCatalogo }]];
    }
    if (url === '/api/ventas/?limit=5&offset=0') {
      return [200, Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        fecha: '2026-11-13T15:00:00Z',
        total: '37000.00',
        cliente: { id: 1, nombre: 'Ana Gómez', email: 'ana@ejemplo.com' },
      }))];
    }
    if (url === '/api/ventas/?limit=5&offset=5') {
      return [200, [{
        id: 42,
        fecha: '2026-11-13T15:00:00Z',
        total: '37000.00',
        cliente: { id: 1, nombre: 'Ana Gómez', email: 'ana@ejemplo.com' },
      }]];
    }
    if (url.startsWith('/api/ventas/?')) {
      return [200, [{
        id: 42,
        fecha: '2026-11-13T15:00:00Z',
        total: '37000.00',
        cliente: { id: 1, nombre: 'Ana Gómez', email: 'ana@ejemplo.com' },
      }]];
    }
    if (url === '/api/ventas/42') {
      return [200, ventaHistorica];
    }
    return [404, { detail: 'No encontrado' }];
  });

  await env.iniciar();

  // Cambiamos limit del historial a 5 y avanzamos a la página siguiente (offset=5).
  env.nodo('historial-limit').value = '5';
  await env.nodo('historial-limit').listeners.change();
  assert.equal(env.peticiones.at(-1).url, '/api/ventas/?limit=5&offset=0');
  assert.equal(env.nodo('historial-siguiente').disabled, false);

  await env.nodo('historial-siguiente').listeners.click();
  assert.equal(env.peticiones.at(-1).url, '/api/ventas/?limit=5&offset=5');
  assert.equal(env.nodo('historial-anterior').disabled, false);
  assert.equal(env.nodo('historial-siguiente').disabled, true);

  // Simulamos que el libro 10 aumentó de precio en el catálogo (PATCH /libros/10 -> 99000.00).
  precioActualCatalogo = '99000.00';
  await env.run('cargarLibrosVenta()');
  assert.equal(env.run('librosVenta[0].precio'), '99000.00');

  // Abrimos el detalle de la venta 42 -> consulta GET /api/ventas/42 y conserva $ 18.500,00 y $ 37.000,00.
  const filaVenta42 = env.nodo('historial-cuerpo').hijos[0];
  const botonDetalle = buscarEnArbol(filaVenta42, (n) => n.tag === 'button');
  assert.ok(botonDetalle, 'Cada fila del historial debe tener botón Ver detalle');
  await botonDetalle.listeners.click();

  assert.equal(env.peticiones.at(-1).url, '/api/ventas/42');
  const textoDetalle = textoPlano(env.nodo('historial-detalle'));
  assert.match(textoDetalle, /Ana Gómez/);
  assert.match(textoDetalle, /ana@ejemplo\.com/);
  assert.match(textoDetalle, /Rayuela/);
  assert.match(textoDetalle, /18\.500,00/);
  assert.match(textoDetalle, /37\.000,00/);
  assert.doesNotMatch(textoDetalle, /99\.000,00/);
});
