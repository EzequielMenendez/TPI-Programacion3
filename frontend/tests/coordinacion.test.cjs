const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Dobles mínimos del formulario: el submit, validación y push son producción.
function alta(tipo, datos) {
  const eventos = [];
  const campos = new Map();
  const nodo = id => {
    if (!campos.has(id)) campos.set(id, {
      listeners: {}, replaceChildren() {}, focus() {},
      classList: { add() {}, remove() {} },
      setAttribute() {}, removeAttribute() {},
      addEventListener(nombre, fn) { this.listeners[nombre] = fn; },
      reset() { this.listeners.reset?.(); },
    });
    return campos.get(id);
  };
  const sandbox = vm.createContext({
    console, Event,
    document: {
      addEventListener() {}, getElementById: nodo,
      createElement() { return { append() {}, textContent: '' }; },
      dispatchEvent(evento) { eventos.push(evento.type); },
    },
    FormData: class { get(campo) { return datos[campo]; } getAll(campo) { return datos[campo] || []; } },
  });
  for (const archivo of ['datos', 'utilidades', 'catalogo', 'libros', 'clientes']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', archivo + '.js'), 'utf8'), sandbox);
  }
  // Presentación fuera de esta prueba; no se reemplazan reglas ni submit.
  vm.runInContext('prepararFormularioLibro=()=>{}; renderizarTablaLibros=()=>{}; refrescarCatalogo=()=>{}; renderizarTablaClientes=()=>{};', sandbox);
  vm.runInContext(tipo === 'libro' ? 'iniciarAltaLibros()' : 'iniciarAltaClientes()', sandbox);
  return { eventos, enviar() { nodo('form-' + tipo).listeners.submit({ preventDefault() {} }); }, run(codigo) { return vm.runInContext(codigo, sandbox); } };
}

test('3.2: alta válida de libro notifica una vez; ISBN duplicado no notifica', () => {
  const prueba = alta('libro', { titulo: 'Temporal', isbn: 'PRUEBA-NUEVA', precio: '1500', editorialId: 'ED-1', generoId: '', autorIds: ['AU-1'] });
  prueba.enviar();
  assert.equal(prueba.run('LIBROS.length'), 7);
  assert.deepEqual(prueba.eventos, ['libros-actualizados']);
  prueba.enviar();
  assert.equal(prueba.run('LIBROS.length'), 7);
  assert.equal(prueba.eventos.length, 1);
});
test('3.2: alta válida de cliente notifica una vez; email duplicado no notifica', () => {
  const prueba = alta('cliente', { nombreCompleto: 'Temporal', email: 'nuevo@ejemplo.com' });
  prueba.enviar();
  assert.equal(prueba.run('CLIENTES.length'), 4);
  assert.deepEqual(prueba.eventos, ['clientes-actualizados']);
  prueba.enviar();
  assert.equal(prueba.run('CLIENTES.length'), 4);
  assert.equal(prueba.eventos.length, 1);
});
