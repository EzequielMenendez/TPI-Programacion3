# Proposal

## Why

Las secciones de **Ventas (`#ventas`)** e **Historial (`#historial`)** del frontend todavía operan como una simulación en memoria apoyada en `LIBROS`, `CLIENTES`, `VENTAS` y `localStorage` del primer parcial. Para completar el **Ejercicio 3 (Registrar y consultar ventas · 25 puntos · Casos G-04, G-05, G-06, G-07)** de la Evaluación Global de Programación III, el frontend debe armar ventas multirrenglón contra los clientes y libros reales del backend, enviar la operación transaccional a `POST /api/ventas/` sin incluir precios ni totales (`extra="forbid"`), confirmar con la respuesta `201 Created`, preservar el borrador ante rechazos `409` o `422`, y consultar el historial paginado (`GET /api/ventas/`) y el detalle histórico (`GET /api/ventas/{id}`) con precios congelados inmutables.

## What Changes

- **Carga reactiva de selectores de venta (`frontend/js/ventas.js`)**: poblar `#venta-cliente` y `#venta-libro` desde `GET /api/clientes/` y `GET /api/libros/` mediante `apiFetch` al iniciar la vista y al recibir los eventos `clientes-actualizados` y `libros-actualizados`, conservando intacto cualquier borrador de venta en curso (`RN-UI-04`).
- **Armado y edición de borrador multirrenglón (`frontend/js/ventas-modelo.js`, `frontend/js/ventas.js`)**: soportar identificadores numéricos de la API (`cliente_id: int`, `libro_id: int`, resolviendo `IN-01`) manteniendo retrocompatibilidad con las funciones puras del modelo, exigir cantidades enteras entre `1` y `10000`, impedir renglones duplicados para el mismo libro (`RN-VEN-02`), y permitir cambiar cantidades o quitar renglones recalculando subtotales y total estimados en centavos.
- **Envío transaccional a `POST /api/ventas/` (`frontend/js/ventas-modelo.js`, `frontend/js/ventas.js`)**: construir el cuerpo estrictamente con `{ cliente_id, renglones: [{ libro_id, cantidad }] }` sin enviar `precio_unitario`, `subtotal` ni `total` (`extra="forbid"`, `RN-VEN-03`, `DD-03`), y deshabilitar `#venta-confirmar` mientras la petición está en vuelo (`RN-UI-03`).
- **Confirmación con respuesta `201 Created` y conservación de borrador ante `409`/`422`**:
  - Con `201`: limpiar el borrador en memoria, mostrar en `#ventas-mensaje` (`role="status"`) el número de venta, cliente, precios unitarios copiados del catálogo, subtotales y total devueltos por el servidor (`VentaRead`), recargar el historial desde `GET /api/ventas/`, abrir el detalle de la venta confirmada y despachar `ventas-actualizadas` / refrescar libros para reflejar el descuento de stock.
  - Con `409` (cliente/libro inexistente o stock insuficiente) o `422` (cuerpo inválido): mostrar los mensajes del servidor en `#ventas-errores` (`role="alert"`) y **conservar intactos** el cliente seleccionado y todos los renglones del borrador (`RN-UI-01`).
- **Consulta paginada de historial y detalle por ID (`frontend/index.html`, `frontend/js/ventas.js`)**: consumir `GET /api/ventas/?limit=20&offset=0` con controles de paginación accesibles en `#historial`, y consultar `GET /api/ventas/{id}` al pulsar "Ver detalle" para desplegar fecha, cliente (`nombre` y `email`), renglones e importes históricos (`precio_unitario`, `subtotal`, `total`) que permanecen inmutables aunque luego cambie el precio del libro con `PATCH /api/libros/{id}` (`RN-VEN-04`, `RN-VEN-07`).

## Capabilities

### New Capabilities
- `ventas-frontend`: Armado de borrador de venta multirrenglón con clientes y libros de la API, registro transaccional mediante `POST /api/ventas/` sin envío de importes, preservación del borrador ante errores `409`/`422`, y consulta paginada de historial (`GET /api/ventas/`) y detalle histórico (`GET /api/ventas/{id}`) con precios congelados.

### Modified Capabilities
<!-- Ninguna capacidad existente cambia sus requisitos a nivel de especificación. -->

## Impact

- `frontend/index.html`: actualización de textos informativos y de botón en `#ventas` e `#historial` (eliminando referencias a simulación local) y adición de controles accesibles de paginación (`limit` / `offset`) en `#historial`.
- `frontend/js/ventas-modelo.js`: soporte de IDs enteros de la API y función pura `construirCuerpoVenta(borrador)` que emite `{ cliente_id, renglones: [{ libro_id, cantidad }] }` sin campos extra, preservando las funciones puras existentes verificadas por `frontend/tests/ventas.test.cjs` y `frontend/tests/persistencia.test.cjs`.
- `frontend/js/ventas.js`: integración completa con `apiFetch` (`GET /clientes/`, `GET /libros/`, `POST /ventas/`, `GET /ventas/`, `GET /ventas/{id}`), sincronización por eventos (`libros-actualizados`, `clientes-actualizados`, `ventas-actualizadas`) y renderizado seguro con `textContent`.
- `frontend/js/catalogo.js` y `frontend/js/libros.js`: escucha opcional del evento `ventas-actualizadas` para refrescar el stock visible tras confirmar una venta.
- `frontend/tests/ventas-api.test.cjs`: suite de pruebas automatizadas en Node (`node:test`) para el contrato de `POST /api/ventas/`, conservación del borrador ante `409`/`422`, historial paginado y detalle con precios históricos inmutables.
