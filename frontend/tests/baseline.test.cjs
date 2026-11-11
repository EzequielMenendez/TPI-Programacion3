const test = require('node:test');
const assert = require('node:assert/strict');
const contexto = require('./contexto.cjs');

test('E3: datos iniciales y relaciones coherentes', () => {
  const run = contexto();
  assert.equal(run('LIBROS.length'), 6);
  assert.equal(run('CLIENTES.length'), 3);
  assert.equal(run('validarRelacionesLibros(LIBROS).length'), 0);
});
test('ids usan mayor sufijo y búsqueda exige id exacto', () => {
  const run = contexto();
  assert.equal(run('siguienteIdPrefijado(LIBROS, "LI")'), 'LI-7');
  assert.equal(run('siguienteIdPrefijado(CLIENTES, "CL")'), 'CL-4');
  assert.equal(run('siguienteIdPrefijado([{id:"VE-9"},{id:"VE-2"}], "VE")'), 'VE-10');
  assert.equal(run('buscarPorId(LIBROS, "no-existe")'), null);
});
test('E3: filtro normalizado, vacío y sin coincidencias', () => {
  const run = contexto();
  assert.equal(run('filtrarPorTitulo(LIBROS, "  VIEN  ").length'), 1);
  assert.equal(run('filtrarPorTitulo(LIBROS, "  ").length'), 6);
  assert.equal(run('filtrarPorTitulo(LIBROS, "zzzzz").length'), 0);
});
test('E4: ISBN normalizado y validaciones de libro', () => {
  const run = contexto();
  assert.equal(run('normalizarIsbn(" A-b 12 ")'), 'ab12');
  run('var datosPrueba={titulo:"Nuevo",isbn:"ISBN-NUEVO",precioTexto:"1500",editorialId:EDITORIALES[0].id,generoId:"",autorIds:[AUTORES[0].id]}');
  assert.equal(run('validarDatosLibro(datosPrueba).errores.length'), 0);
  assert.ok(run('validarDatosLibro({...datosPrueba,isbn:LIBROS[0].isbn}).errores.length') > 0);
  for (const precio of ['', '0', '-1', 'Infinity', 'NaN']) {
    assert.ok(run(`validarDatosLibro({...datosPrueba,precioTexto:${JSON.stringify(precio)}}).errores.length`) > 0);
  }
  assert.ok(run('validarDatosLibro({...datosPrueba,autorIds:[],editorialId:"X"}).errores.length') >= 2);
});
test('E4: email normalizado, válido, duplicado e inválido', () => {
  const run = contexto();
  assert.equal(run('normalizarEmail("  PRUEBA@EJEMPLO.COM  ")'), 'prueba@ejemplo.com');
  assert.equal(run('validarDatosCliente({nombreCompleto:"Prueba",email:"nuevo@ejemplo.com"}).errores.length'), 0);
  assert.ok(run('validarDatosCliente({nombreCompleto:"Prueba",email:CLIENTES[0].email.toUpperCase()}).errores.length') > 0);
  assert.equal(run('validarDatosCliente({nombreCompleto:"",email:"sin-email"}).errores.length'), 2);
});
