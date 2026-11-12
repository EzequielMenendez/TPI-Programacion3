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
test('Global E2: validaciones de libro según el contrato de la API', () => {
  const run = contexto();
  run('var datosPrueba={titulo:"Nuevo",isbn:"978-950-000-010-3",precioTexto:"1500.50",stockTexto:"0",editorialId:"1",generoId:""}');
  run('var autoriasPrueba=[{autor_id:1,nombre:"Uno",rol:"autor"}]');
  assert.equal(run('validarDatosLibro(datosPrueba, autoriasPrueba).errores.length'), 0);
  for (const isbn of ['', 'corto', 'ISBN-NUEVO-123', '978 950 000 010 3']) {
    assert.ok(run(`validarDatosLibro({...datosPrueba,isbn:${JSON.stringify(isbn)}}, autoriasPrueba).errores.length`) > 0, isbn);
  }
  for (const precio of ['', '0', '-1', 'Infinity', 'NaN', '10.123', '1e3']) {
    assert.ok(run(`validarDatosLibro({...datosPrueba,precioTexto:${JSON.stringify(precio)}}, autoriasPrueba).errores.length`) > 0, precio);
  }
  for (const stock of ['', '-1', '1.5', 'abc', '2147483648']) {
    assert.ok(run(`validarDatosLibro({...datosPrueba,stockTexto:${JSON.stringify(stock)}}, autoriasPrueba).errores.length`) > 0, stock);
  }
  assert.equal(run('validarDatosLibro({...datosPrueba,stockTexto:"12"}, autoriasPrueba).errores.length'), 0);
  assert.equal(run('validarDatosLibro({...datosPrueba,generoId:"2"}, autoriasPrueba).errores.length'), 0);
  // Sin editorial y sin autores: dos errores juntos.
  assert.equal(run('validarDatosLibro({...datosPrueba,editorialId:""}, []).errores.length'), 2);
  assert.ok(run('validarDatosLibro(datosPrueba, [...autoriasPrueba, ...autoriasPrueba]).errores.length') > 0);
});
test('Global E2: cuerpo de POST /libros/ con autor_id, rol y orden', () => {
  const run = contexto();
  const cuerpo = JSON.parse(run(`JSON.stringify(construirCuerpoLibro(
    {titulo:"Nuevo",isbn:"978-950-000-010-3",precioTexto:"1500.50",stockTexto:"7",editorialId:"2",generoId:""},
    [{autor_id:5,nombre:"A",rol:"autor"},{autor_id:3,nombre:"B",rol:"traductor"}]))`));
  assert.deepEqual(cuerpo, {
    titulo: 'Nuevo', isbn: '978-950-000-010-3', precio: '1500.50', stock: 7,
    editorial_id: 2, genero_id: null,
    autores: [{ autor_id: 5, rol: 'autor', orden: 1 }, { autor_id: 3, rol: 'traductor', orden: 2 }],
  });
  assert.equal(run('construirCuerpoLibro({titulo:"N",isbn:"1234567890",precioTexto:"1",stockTexto:"0",editorialId:"1",generoId:"3"},[]).genero_id'), 3);
});
test('Global E2: autorías sin repetir y con rol válido', () => {
  const run = contexto();
  run('var lista=[{autor_id:1,nombre:"Uno",rol:"autor"}]');
  assert.equal(run('motivoRechazoAutoria(lista, 2, "coautor")'), null);
  assert.match(run('motivoRechazoAutoria(lista, 1, "coautor")'), /ya está marcado/);
  assert.match(run('motivoRechazoAutoria(lista, 2, "editor")'), /rol/);
  assert.equal(run('leerIdEntero(" 12 ")'), 12);
  for (const texto of ['', '0', '-3', '1.5', 'abc', '2147483648']) {
    assert.equal(run(`leerIdEntero(${JSON.stringify(texto)})`), null, texto);
  }
  assert.equal(run('describirAutorias([{nombre:"B",rol:"traductor",orden:2},{nombre:"A",rol:"autor",orden:1}])'), 'A (autor), B (traductor)');
});
test('Global E2: validaciones y cuerpo de cliente', () => {
  const run = contexto();
  assert.equal(run('validarDatosCliente({nombre:"Prueba",email:"nuevo@ejemplo.com"}).errores.length'), 0);
  assert.equal(run('validarDatosCliente({nombre:"",email:"sin-email"}).errores.length'), 2);
  assert.ok(run('validarDatosCliente({nombre:"x".repeat(121),email:"a@b.com"}).errores.length') > 0);
  assert.deepEqual(JSON.parse(run('JSON.stringify(construirCuerpoCliente({nombre:"Ana",email:"ana@ejemplo.com",otro:1}))')), { nombre: 'Ana', email: 'ana@ejemplo.com' });
});
test('Global E2: mensajes del servidor para 409 y 422', () => {
  const run = contexto();
  assert.deepEqual(JSON.parse(run('JSON.stringify(mensajesDeErrorApi(409, {detail:"Ya existe un libro con ese ISBN."}))')), ['Ya existe un libro con ese ISBN.']);
  assert.deepEqual(
    JSON.parse(run('JSON.stringify(mensajesDeErrorApi(422, {detail:[{loc:["body","autores",0,"rol"],msg:"Input should be autor"},{loc:["body"],msg:"Value error, x"}]}))')),
    ['autores[0].rol: Input should be autor', 'Value error, x']
  );
  assert.deepEqual(JSON.parse(run('JSON.stringify(mensajesDeErrorApi(502, null))')), ['El servidor respondió con un error (502).']);
});
