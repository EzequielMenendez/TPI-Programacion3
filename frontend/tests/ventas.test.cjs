const test = require('node:test');
const assert = require('node:assert/strict');
const contexto = require('./contexto.cjs');

test('1.2: cantidades y cálculo exacto de la consigna', () => {
  const run = contexto();
  assert.equal(run('cantidadVenta("2")'), 2);
  run('var librosPrueba=[{id:"A",titulo:"Uno",isbn:"a",precio:1500},{id:"B",titulo:"Dos",isbn:"b",precio:2000}]');
  assert.equal(run('calcularVenta([{libroId:"A",cantidad:2},{libroId:"B",cantidad:1}],librosPrueba).totalCentavos'), 500000);
});
test('1.2: cantidades inválidas y límites seguros', () => {
  const run = contexto();
  for (const valor of ['', ' ', '0', '-2', '1.5', 'NaN', 'Infinity', '9007199254740992', null, true]) {
    assert.equal(run(`cantidadVenta(${JSON.stringify(valor)})`), null);
  }
  for (const precio of ['Infinity', 'NaN', '-1', '0', '0.001', 'Number.MAX_VALUE']) {
    assert.equal(run(`precioVentaCentavos(${precio})`), null);
  }
  assert.ok(run('calcularVenta([{libroId:"A",cantidad:2}],[{id:"A",precio:Number.MAX_SAFE_INTEGER/100}]).errores.length') > 0);
  assert.ok(run('calcularVenta([{libroId:"A",cantidad:1},{libroId:"B",cantidad:1}],[{id:"A",precio:Number.MAX_SAFE_INTEGER/100},{id:"B",precio:1}]).errores.length') > 0);
});
test('1.2: centavos evitan 0.1 + 0.2 y redondean a centavo', () => {
  const run = contexto();
  assert.equal(run('calcularVenta([{libroId:"A",cantidad:1},{libroId:"B",cantidad:1}],[{id:"A",precio:0.1},{id:"B",precio:0.2}]).totalCentavos'), 30);
  assert.equal(run('precioVentaCentavos(1.005)'), 101);
  assert.equal(run('precioVentaCentavos(10.075)'), 1008);
  assert.equal(run('formatearCentavosVenta(9007199254740991)'), run('formatoPrecio.format("90071992547409.91")'));
  assert.match(run('formatearCentavosVenta(calcularVenta([{libroId:"A",cantidad:Number.MAX_SAFE_INTEGER}],[{id:"A",precio:0.01}]).totalCentavos)'), /90\.071\.992\.547\.409,91$/);
});
test('2.1: agregar, modificar y quitar sin duplicar libros', () => {
  const run = contexto();
  run('var b={clienteId:"",renglones:[]}; var ls=[{id:"A",precio:1500,titulo:"Uno",isbn:"a"}]');
  assert.equal(run('agregarRenglonVenta(b,ls,"A","2").errores.length'), 0);
  assert.equal(run('b.renglones.length'), 1);
  assert.ok(run('agregarRenglonVenta(b,ls,"A","1").errores.length') > 0);
  assert.equal(run('b.renglones[0].cantidad'), 2);
  assert.equal(run('modificarCantidadVenta(b,ls,"A","3").totalCentavos'), 450000);
  assert.equal(run('quitarRenglonVenta(b,"A")'), true);
  assert.equal(run('b.renglones.length'), 0);
});
test('2.1: error no altera borrador; quitar desconocido y cantidad inválida', () => {
  const run = contexto();
  run('var b={clienteId:"",renglones:[]}; var ls=[{id:"A",precio:2}]');
  assert.ok(run('agregarRenglonVenta(b,ls,"X",1).errores.length') > 0);
  assert.ok(run('agregarRenglonVenta(b,ls,"A","").errores.length') > 0);
  assert.equal(run('b.renglones.length'), 0);
  run('agregarRenglonVenta(b,ls,"A",1)');
  assert.ok(run('modificarCantidadVenta(b,ls,"A",0).errores.length') > 0);
  assert.equal(run('b.renglones[0].cantidad'), 1);
  assert.ok(run('modificarCantidadVenta(b,ls,"X",2).errores.length') > 0);
  assert.equal(run('quitarRenglonVenta(b,"X")'), false);
  assert.equal(run('calcularVenta(b.renglones,ls).totalCentavos'), 200);
});
test('2.2: confirmar registra snapshot y limpia; siguiente envío no duplica', () => {
  const run = contexto();
  run('var b={clienteId:"C",renglones:[{libroId:"A",cantidad:2}]}; var ls=[{id:"A",titulo:"Original",isbn:"ISBN-A",precio:1500}]; var cs=[{id:"C",nombreCompleto:"Original",email:"c@ejemplo.com"}]; var hs=[]');
  assert.equal(run('confirmarVenta(b,ls,cs,hs,"2026-10-19T12:00:00.000Z").errores.length'), 0);
  assert.equal(run('hs.length'), 1);
  assert.equal(run('hs[0].totalCentavos'), 300000);
  assert.equal(run('hs[0].id'), 'VE-1');
  assert.equal(run('b.clienteId'), '');
  assert.equal(run('b.renglones.length'), 0);
  assert.ok(run('confirmarVenta(b,ls,cs,hs).errores.length') > 0);
  assert.equal(run('hs.length'), 1);
});
test('2.2: confirmaciones fallidas preservan borrador e historial', () => {
  for (const cambio of ['b.clienteId="X"', 'b.renglones=[]', 'b.renglones[0].libroId="X"', 'b.renglones[0].cantidad=""', 'b.renglones[0].cantidad=Infinity', 'b.renglones.push({...b.renglones[0]})', 'ls[0].precio=Infinity', 'ls[0].precio=0']) {
    const run = contexto();
    run('var b={clienteId:"C",renglones:[{libroId:"A",cantidad:1}]}; var ls=[{id:"A",precio:2}]; var cs=[{id:"C",nombreCompleto:"Uno",email:"c@e.com"}]; var hs=[]');
    run(cambio);
    const anterior = run('JSON.stringify(b)');
    assert.ok(run('confirmarVenta(b,ls,cs,hs).errores.length') > 0, cambio);
    assert.equal(run('JSON.stringify(b)'), anterior);
    assert.equal(run('hs.length'), 0);
  }
});
test('2.2: snapshot independiente y dos ids distintos', () => {
  const run = contexto();
  run('var b={clienteId:"C",renglones:[{libroId:"A",cantidad:2}]}; var ls=[{id:"A",precio:2,titulo:"Original",isbn:"ISBN-A"}]; var cs=[{id:"C",nombreCompleto:"Persona",email:"c@e.com"}]; var hs=[]; var anterior=b.renglones; confirmarVenta(b,ls,cs,hs); var snapshot=JSON.stringify(hs[0])');
  assert.equal(run('hs[0].renglones === anterior'), false);
  assert.equal(run('hs[0].cliente === cs[0]'), false);
  run('ls[0].precio=99; ls[0].titulo="Cambio"; ls[0].isbn="Otro"; cs[0].nombreCompleto="Otra"; cs[0].email="otro@e.com"; anterior[0].cantidad=999; b.clienteId="C"; b.renglones=[{libroId:"A",cantidad:3}]; confirmarVenta(b,ls,cs,hs)');
  assert.equal(run('JSON.stringify(hs[0])'), run('snapshot'));
  assert.equal(run('hs[1].id'), 'VE-2');
  assert.equal(run('hs[1].totalCentavos'), 29700);
});
