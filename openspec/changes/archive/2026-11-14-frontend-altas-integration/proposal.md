# C-02 · frontend-altas-integration

## Por qué

Las altas de libros y clientes del frontend se guardaban en arrays locales con
ids `LI-n` / `CL-n` y persistían en `localStorage` (IN-01). El Ejercicio 2 del
Global pide que se registren en PostgreSQL a través de la API, con las mismas
validaciones visibles y mostrando el mensaje del servidor cuando rechaza el
alta (casos G-02, G-03 y G-04).

## Qué cambia

- Nuevo cliente HTTP centralizado `frontend/js/api.js` (`apiFetch`) con base
  `/api`, barra final en las colecciones y traducción de los errores 409/422
  a mensajes legibles. Es el que C-01 debe reutilizar para el catálogo.
- `#form-libro`: editorial, género y autores se cargan desde la API (DD-01);
  se agrega el campo stock; las autorías se arman con `autor_id`, `rol` y
  `orden` (IN-02) y se envían en `POST /api/libros/`.
- `#form-cliente`: envía `{ nombre, email }` a `POST /api/clientes/` y suma una
  búsqueda por id con `GET /api/clientes/{id}`.
- Éxito (201): se usa el registro devuelto, se vacía el formulario
  (RN-UI-02), se agrega la fila a la tabla y se emite `libros-actualizados` /
  `clientes-actualizados` con el registro en `detail` (RN-UI-04).
- Rechazo (409/422): se muestra el mensaje del servidor en `role="alert"` y se
  conserva todo lo cargado (RN-UI-01, DD-05).

## Fuera de alcance

- Catálogo y búsqueda contra la API (C-01).
- Selectores e historial de Ventas con ids enteros (C-03): por ahora Ventas
  sigue con sus datos locales; el evento con `detail` queda listo para C-03.
- Mover el frontend a `frontend/public/` (C-04).
