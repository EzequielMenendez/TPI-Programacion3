const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const raiz = path.join(__dirname, '..');

test('3.1: contrato HTML de navegación, controles etiquetados y mensajes E5', () => {
  const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
  for (const seccion of ['ventas', 'historial']) {
    assert.match(html, new RegExp(`href="#${seccion}"`));
    assert.match(html, new RegExp(`<section id="${seccion}" aria-labelledby="${seccion}-titulo"`));
  }
  for (const id of ['venta-cliente', 'venta-libro', 'venta-cantidad']) {
    assert.match(html, new RegExp(`for="${id}"`));
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /id="form-venta"[^>]*novalidate/);
  assert.match(html, /id="ventas-errores"[^>]*role="alert"/);
  assert.match(html, /id="ventas-mensaje"[^>]*role="status"/);
  assert.match(html, /id="historial-vacio"/);
  assert.match(html, /id="historial-detalle"/);
});
test('Global E1: controles de paginación del catálogo etiquetados y accesibles', () => {
  const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
  assert.match(html, /for="catalogo-limit"/);
  assert.match(html, /id="catalogo-limit"/);
  assert.match(html, /<option value="20" selected>20<\/option>/);
  assert.match(html, /id="catalogo-anterior"[^>]*type="button"/);
  assert.match(html, /id="catalogo-siguiente"[^>]*type="button"/);
  assert.match(html, /id="catalogo-pagina"[^>]*aria-live="polite"/);
});
test('3.1: scripts clásicos locales, sin inyección de HTML ni almacenamiento', () => {
  const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
  assert.match(html, /src="js\/ventas-modelo.js" defer/);
  assert.match(html, /src="js\/ventas.js" defer/);
  const modelo = fs.readFileSync(path.join(raiz, 'js/ventas-modelo.js'), 'utf8');
  const interfaz = fs.readFileSync(path.join(raiz, 'js/ventas.js'), 'utf8');
  assert.doesNotMatch(modelo + interfaz, /innerHTML|localStorage|sessionStorage|indexedDB|fetch\s*\(|\bimport\s/);
  assert.ok(html.indexOf('js/catalogo.js') < html.indexOf('js/ventas-modelo.js'));
  assert.ok(html.indexOf('js/ventas-modelo.js') < html.indexOf('js/ventas.js'));
});
