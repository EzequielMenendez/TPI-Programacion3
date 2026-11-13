# Design

## Context

See `proposal.md` for motivation and scope. Actualmente `frontend/js/ventas-modelo.js` y `frontend/js/ventas.js` implementan el Ejercicio 5 del primer parcial: leen `LIBROS`, `CLIENTES` y `VENTAS` desde variables globales hidratadas por `localStorage` (`frontend/js/datos.js`) y usan identificadores de texto (`"LI-1"`, `"CL-1"`, `"VE-1"`). Además, la suite de tests existente (`frontend/tests/ventas.test.cjs`, `frontend/tests/persistencia.test.cjs` y `frontend/tests/interfaz.test.cjs`) valida tanto las funciones puras de `ventas-modelo.js` como la ausencia de llamadas literales a `fetch(`, `localStorage` o `innerHTML` en `ventas-modelo.js` y `ventas.js`.

El backend (`backend/app/modules/ventas/`) expone:
- `POST /ventas/` (`201 Created`): recibe `VentaCreate` (`{ cliente_id: int, renglones: [{ libro_id: int, cantidad: int }] }`, ambos con `extra="forbid"`) y devuelve `VentaRead` (`{ id, fecha, total, cliente: { id, nombre, email }, renglones: [{ libro_id, titulo, cantidad, precio_unitario, subtotal }] }`).
- `GET /ventas/?limit=20&offset=0`: devuelve `list[VentaListado]` (`[{ id, fecha, total, cliente: { id, nombre, email } }]`, sin `renglones`).
- `GET /ventas/{id}`: devuelve `VentaRead` completo con `renglones`, `precio_unitario`, `subtotal` y `total`.

## UI Mockups

Decision: no (project policy)

## Goals / Non-Goals

**Goals:**
- Conectar `#ventas` e `#historial` con `GET /api/clientes/`, `GET /api/libros/`, `POST /api/ventas/`, `GET /api/ventas/` y `GET /api/ventas/{id}` a través de `apiFetch` (`frontend/js/api.js`).
- Preservar el 100% de compatibilidad con las pruebas unitarias existentes (`ventas.test.cjs`, `persistencia.test.cjs`, `interfaz.test.cjs`) manteniendo las firmas puras en `frontend/js/ventas-modelo.js` y sumando las funciones específicas del contrato HTTP (`validarBorradorVentaApi`, `construirCuerpoVenta`, `describirConfirmacionVenta`).
- Garantizar que ningún precio ni total viaje en el cuerpo de `POST /api/ventas/` (`extra="forbid"`) y que el borrador en memoria se conserve intacto ante respuestas `409` o `422`.

**Non-Goals:**
- No se modifican esquemas, servicios ni routers del backend (`backend/app/modules/ventas/` ya implementa transacciones, bloqueo de stock, `extra="forbid"` y tarea en segundo plano).
- No se rediseña la hoja de estilos `frontend/css/styles.css` más allá de reutilizar las clases existentes (`.pagination`, `.table`, `.detalle-venta`).

## Decisions

1. **Extensión retrocompatible de `frontend/js/ventas-modelo.js`**
   - *Decisión*: Mantener intactas las funciones puras `cantidadVenta`, `precioVentaCentavos`, `formatearCentavosVenta`, `calcularVenta`, `agregarRenglonVenta`, `modificarCantidadVenta`, `quitarRenglonVenta` y `confirmarVenta`, normalizando comparaciones de IDs con `String(...)` cuando corresponda o permitiendo tanto IDs numéricos como strings en el borrador (`{ clienteId, renglones: [{ libroId, cantidad }] }`), y agregar:
     - `validarBorradorVenta(borrador, libros, clientes)`: valida cliente seleccionado, al menos un renglón, cantidades enteras `1..10000`, unicidad de `libroId` y existencia de cliente/libros cargados sin mutar el borrador.
     - `construirCuerpoVenta(borrador)`: devuelve exactamente `{ cliente_id: Number(borrador.clienteId), renglones: borrador.renglones.map(r => ({ libro_id: Number(r.libroId), cantidad: Number(r.cantidad) })) }`.
   - *Alternativa descartada*: Reemplazar las funciones de `ventas-modelo.js` por llamadas asincrónicas directas. Se descartó porque rompería `frontend/tests/ventas.test.cjs` y `frontend/tests/persistencia.test.cjs` y mezclaría lógica de dominio con I/O.

2. **Consumo exclusivo mediante `apiFetch` en `frontend/js/ventas.js`**
   - *Decisión*: En `frontend/js/ventas.js`, realizar todas las peticiones HTTP invocando `apiFetch("/clientes/", ...)`, `apiFetch("/libros/", ...)`, `apiFetch("/ventas/", ...)` y `apiFetch(\`/ventas/\${id}\`)`.
   - *Racional*: Cumple la Regla Dura 1 (prefijo `/api` y barra final en colecciones), evita usar el token literal `fetch(` dentro de `ventas.js` (respetando la aserción estática de `frontend/tests/interfaz.test.cjs` línea 38) y aprovecha el parseo uniforme de errores `409` y `422` de `ErrorApi` + `mensajesDeError(error)`.

3. **Sincronización en caliente de selectores y stock mediante eventos de documento**
   - *Decisión*:
     - Escuchar `clientes-actualizados` y `libros-actualizados` en `document` para actualizar `clientesVenta` y `librosVenta` y repoblar `#venta-cliente` y `#venta-libro` preservando la selección actual y los renglones de `borradorVenta`.
     - Al confirmar una venta (`201 Created`), despachar `document.dispatchEvent(new CustomEvent("ventas-actualizadas", { detail: { venta } }))`, recargar `GET /libros/` para actualizar el stock mostrado en `#venta-libro`, y escuchar `ventas-actualizadas` en `catalogo.js` y `libros.js` para refrescar el stock visible en toda la SPA.
   - *Alternativa descartada*: Recargar toda la página (`location.reload()`). Se descartó porque rompería la experiencia SPA y perdería el mensaje de confirmación (`#ventas-mensaje`) y el detalle recién abierto.

4. **Historial paginado (`GET /api/ventas/`) + Detalle bajo demanda (`GET /api/ventas/{id}`)**
   - *Decisión*:
     - La tabla `#historial-cuerpo` se alimenta de `GET /api/ventas/?limit={limit}&offset={offset}` (`VentaListado`, que trae `id`, `fecha`, `total`, `cliente: { id, nombre, email }`).
     - Al hacer clic en "Ver detalle" (o inmediatamente después de recibir `201 Created` en `POST /api/ventas/`), se invoca `GET /api/ventas/{id}` (`VentaRead`) y se renderiza `#historial-detalle` con cabecera (`Venta #{id}`, fecha, `cliente.nombre`, `cliente.email`) y tabla de renglones (`titulo`, `cantidad`, `precio_unitario`, `subtotal`, `total`) usando `formatoPrecio.format(Number(...))` y `textContent`.

## Risks / Trade-offs

- **[Risk] Diferencia en el nombre del campo del cliente (`nombre` en la API vs `nombreCompleto` en semillas TP1)** → *Mitigación*: En los helpers de renderizado de `ventas.js`, resolver `cliente.nombre ?? cliente.nombreCompleto` para soportar transparentemente el contrato `ClienteEnVenta` (`{ id, nombre, email }`) del backend.
- **[Risk] Envío accidental de campos adicionales en `POST /api/ventas/` rechazado por `extra="forbid"`** → *Mitigación*: Centralizar el armado del payload en `construirCuerpoVenta(borrador)` y cubrirlo con un test unitario estricto que verifique `Object.keys(cuerpo)` y `Object.keys(cuerpo.renglones[0])`.
- **[Risk] Doble clic en `#venta-confirmar` generando dos ventas seguidas** → *Mitigación*: Deshabilitar `#venta-confirmar` antes del `await apiFetch("/ventas/", ...)` y rehabilitarlo en el bloque `finally`.
