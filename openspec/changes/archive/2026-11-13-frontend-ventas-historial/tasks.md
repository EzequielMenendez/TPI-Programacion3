# Tasks

## 1. Contrato de Modelo de Ventas y Marcado HTML (`#ventas` e `#historial`)

- [x] 1.1 Extender `frontend/js/ventas-modelo.js` con soporte para IDs enteros de la API (`cliente_id`, `libro_id`), límite de cantidad `1..10000`, `validarBorradorVenta(borrador, libros, clientes)`, `construirCuerpoVenta(borrador)` (`{ cliente_id, renglones: [{ libro_id, cantidad }] }` sin precios ni totales) y `describirConfirmacionVenta(venta)`, verificando con `node --test frontend/tests/ventas.test.cjs frontend/tests/persistencia.test.cjs` que las pruebas puras existentes siguen pasando y las nuevas pruebas de contrato de `construirCuerpoVenta` pasan.
- [x] 1.2 Actualizar `frontend/index.html` en las secciones `#ventas` e `#historial` para reflejar el registro real contra la API (botón `"Confirmar venta"`, textos informativos sin referencia a almacenamiento local y controles accesibles de paginación `#historial-limit`, `#historial-anterior`, `#historial-siguiente`, `#historial-pagina` más `#historial-errores`), verificando que `node --test frontend/tests/interfaz.test.cjs` pasa.

## 2. Integración de `#ventas` con la API (`GET /clientes/`, `GET /libros/`, `POST /ventas/`)

- [x] 2.1 Implementar en `frontend/js/ventas.js` la carga inicial y sincronización reactiva de los selectores `#venta-cliente` (`GET /api/clientes/`) y `#venta-libro` (`GET /api/libros/`) al iniciar y al recibir `clientes-actualizados` y `libros-actualizados` sin alterar el borrador en curso, verificando mediante pruebas automatizadas en `frontend/tests/ventas-api.test.cjs`.
- [x] 2.2 Implementar en `frontend/js/ventas.js` el armado interactivo del borrador (agregar renglón, cambiar cantidad en línea, quitar renglón, rechazar libro duplicado) y el envío `POST /api/ventas/` con deshabilitación de `#venta-confirmar`, confirmación `201 Created` (mostrando precios unitarios copiados del catálogo, subtotales y total de la respuesta, limpiando el borrador y emitiendo `ventas-actualizadas`) y preservación estricta del borrador ante errores `409` o `422`, verificando con `node --test frontend/tests/ventas-api.test.cjs`.
- [x] 2.3 Suscribir `frontend/js/catalogo.js` y `frontend/js/libros.js` al evento `ventas-actualizadas` para refrescar el stock visible tras una venta confirmada, verificando que toda la suite `node --test frontend/tests/*.test.cjs` permanece en verde.

## 3. Historial Paginado (`GET /ventas/`), Detalle por ID (`GET /ventas/{id}`) e Inmutabilidad de Precios

- [x] 3.1 Implementar en `frontend/js/ventas.js` la consulta paginada `GET /api/ventas/?limit={limit}&offset={offset}` en `#historial` y la apertura del detalle `GET /api/ventas/{id}` en `#historial-detalle` mostrando fecha, cliente (`nombre` y `email`), renglones e importes históricos (`precio_unitario`, `subtotal`, `total`), verificando en `frontend/tests/ventas-api.test.cjs` que un cambio posterior del precio del libro en el catálogo (`PATCH /api/libros/{id}`) no altera los importes históricos mostrados en el detalle de la venta.
- [x] 3.2 Actualizar `frontend/README.md` documentando el consumo de `GET /api/clientes/`, `GET /api/libros/`, `POST /api/ventas/`, `GET /api/ventas/` y `GET /api/ventas/{id}` en Ventas e Historial, y verificar que `node --test frontend/tests/*.test.cjs` pasa el 100% de las pruebas.

## Workflow follow-up

- Archivar el change con `/opsx:archive frontend-ventas-historial` una vez implementadas y verificadas todas las tareas.
- Marcar `[x]` en `CHANGES.md` para `[C-03] frontend-ventas-historial`.
