const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

module.exports = function contexto() {
  const sandbox = vm.createContext({ console, document: { addEventListener() {} } });
  for (const archivo of ['datos', 'utilidades', 'catalogo', 'libros', 'clientes', 'ventas-modelo']) {
    const ruta = path.join(__dirname, '..', 'js', archivo + '.js');
    if (fs.existsSync(ruta)) vm.runInContext(fs.readFileSync(ruta, 'utf8'), sandbox, { filename: ruta });
  }
  return codigo => vm.runInContext(codigo, sandbox);
};
