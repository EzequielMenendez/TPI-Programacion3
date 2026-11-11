const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function crearAlmacenamiento() {
  const valores = new Map();
  return {
    getItem(clave) { return valores.has(clave) ? valores.get(clave) : null; },
    setItem(clave, valor) { valores.set(clave, String(valor)); },
    removeItem(clave) { valores.delete(clave); },
  };
}

function contextoPersistencia(almacenamiento = crearAlmacenamiento(), autoInicializar = false) {
  const sandbox = vm.createContext({
    console,
    localStorage: almacenamiento,
    __E6_NO_AUTOINICIALIZAR__: !autoInicializar,
    document: { addEventListener() {} },
  });
  const datos = path.join(__dirname, '..', 'js', 'datos.js');
  vm.runInContext(fs.readFileSync(datos, 'utf8'), sandbox, { filename: datos });
  const utilidades = path.join(__dirname, '..', 'js', 'utilidades.js');
  vm.runInContext(fs.readFileSync(utilidades, 'utf8'), sandbox, { filename: utilidades });
  const catalogo = path.join(__dirname, '..', 'js', 'catalogo.js');
  vm.runInContext(fs.readFileSync(catalogo, 'utf8'), sandbox, { filename: catalogo });
  const ventasModelo = path.join(__dirname, '..', 'js', 'ventas-modelo.js');
  vm.runInContext(fs.readFileSync(ventasModelo, 'utf8'), sandbox, { filename: ventasModelo });
  return { run: (codigo) => vm.runInContext(codigo, sandbox), almacenamiento };
}

test('E6: primera carga guarda semillas y reaperturas no las duplican', () => {
  const { run, almacenamiento } = contextoPersistencia();
  const primera = run('hidratarEstadoBiblioteca()');
  const segunda = run('hidratarEstadoBiblioteca()');

  assert.equal(primera.origen, 'semillas');
  assert.equal(segunda.origen, 'persistido');
  assert.equal(primera.estado.libros.length, 6);
  assert.equal(segunda.estado.libros.length, 6);
  assert.equal(primera.estado.clientes.length, 3);
  assert.equal(segunda.estado.ventas.length, 0);
  assert.ok(almacenamiento.getItem('paginas-del-sol.estado.v1'));
});

test('E6: hidrata un estado válido y descarta estado inválido', () => {
  const almacenamiento = crearAlmacenamiento();
  almacenamiento.setItem('paginas-del-sol.estado.v1', JSON.stringify({
    version: 1,
    libros: [{ id: 'LI-99', titulo: 'Persistido', isbn: 'P-1', precio: 1500, editorialId: 'ED-1', generoId: null, autorIds: ['AU-1'] }],
    clientes: [{ id: 'CL-99', nombreCompleto: 'Persona', email: 'persona@ejemplo.com' }],
    ventas: [],
  }));
  const restaurado = contextoPersistencia(almacenamiento).run('hidratarEstadoBiblioteca()');
  assert.equal(restaurado.origen, 'persistido');
  assert.equal(restaurado.estado.libros[0].id, 'LI-99');

  almacenamiento.setItem('paginas-del-sol.estado.v1', '{no es json}');
  const recuperado = contextoPersistencia(almacenamiento).run('hidratarEstadoBiblioteca()');
  assert.equal(recuperado.origen, 'semillas');
  assert.equal(recuperado.estado.libros.length, 6);
});

test('E6: el arranque usa las colecciones hidratadas antes de crear ventas', () => {
  const almacenamiento = crearAlmacenamiento();
  const primero = contextoPersistencia(almacenamiento, true);
  assert.equal(primero.run('LIBROS.length'), 6);
  assert.equal(primero.run('VENTAS.length'), 0);
  primero.run('LIBROS.push({id:"LI-77"})');
  primero.run('guardarEstadoBiblioteca(estadoActualBiblioteca(VENTAS))');

  const recarga = contextoPersistencia(almacenamiento, true);
  assert.equal(recarga.run('LIBROS.filter((libro) => libro.id === "LI-77").length'), 1);
  assert.equal(recarga.run('CLIENTES.length'), 3);
});

test('E6: persiste altas válidas y una venta confirmada de $ 5.000', () => {
  const almacenamiento = crearAlmacenamiento();
  const { run } = contextoPersistencia(almacenamiento, true);
  run('LIBROS = [{id:"A",titulo:"Uno",isbn:"ISBN-A",precio:1500},{id:"B",titulo:"Dos",isbn:"ISBN-B",precio:2000}]');
  run('CLIENTES = [{id:"C",nombreCompleto:"Cliente",email:"cliente@ejemplo.com"}]');
  run('VENTAS.length = 0');
  run('LIBROS.push({id:"LI-99",titulo:"Alta",isbn:"ISBN-99",precio:3000})');
  run('CLIENTES.push({id:"CL-99",nombreCompleto:"Alta",email:"alta@ejemplo.com"})');
  run('var borradorPrueba={clienteId:"C",renglones:[{libroId:"A",cantidad:2},{libroId:"B",cantidad:1}]}; confirmarVenta(borradorPrueba, LIBROS, CLIENTES, VENTAS, "2026-10-20T12:00:00.000Z")');
  assert.equal(run('persistirEstadoBiblioteca(VENTAS)'), true);

  const estado = JSON.parse(almacenamiento.getItem('paginas-del-sol.estado.v1'));
  assert.equal(estado.libros.some((libro) => libro.id === 'LI-99'), true);
  assert.equal(estado.clientes.some((cliente) => cliente.id === 'CL-99'), true);
  assert.equal(estado.ventas.length, 1);
  assert.equal(estado.ventas[0].totalCentavos, 500000);
  assert.equal(estado.ventas[0].renglones[0].subtotalCentavos, 300000);
  assert.equal(estado.ventas[0].renglones[1].subtotalCentavos, 200000);
});

test('E6: cambiar sólo el catálogo persistido no altera el precio histórico', () => {
  const almacenamiento = crearAlmacenamiento();
  const { run } = contextoPersistencia(almacenamiento, true);
  run('LIBROS = [{id:"A",titulo:"Uno",isbn:"ISBN-A",precio:1500},{id:"B",titulo:"Dos",isbn:"ISBN-B",precio:2000}]');
  run('CLIENTES = [{id:"C",nombreCompleto:"Cliente",email:"cliente@ejemplo.com"}]');
  run('VENTAS.length = 0');
  run('var borradorHistorico={clienteId:"C",renglones:[{libroId:"A",cantidad:2},{libroId:"B",cantidad:1}]}; confirmarVenta(borradorHistorico, LIBROS, CLIENTES, VENTAS, "2026-10-20T12:00:00.000Z"); persistirEstadoBiblioteca(VENTAS)');

  const estadoManipulado = JSON.parse(almacenamiento.getItem('paginas-del-sol.estado.v1'));
  estadoManipulado.libros.find((libro) => libro.id === 'A').precio = 9999;
  almacenamiento.setItem('paginas-del-sol.estado.v1', JSON.stringify(estadoManipulado));

  const recarga = contextoPersistencia(almacenamiento, true);
  assert.equal(recarga.run('LIBROS.find((libro) => libro.id === "A").precio'), 9999);
  assert.equal(recarga.run('VENTAS[0].renglones[0].precioUnitarioCentavos'), 150000);
  assert.equal(recarga.run('VENTAS[0].renglones[0].subtotalCentavos'), 300000);
  assert.equal(recarga.run('VENTAS[0].renglones[1].subtotalCentavos'), 200000);
  assert.equal(recarga.run('VENTAS[0].totalCentavos'), 500000);
});
