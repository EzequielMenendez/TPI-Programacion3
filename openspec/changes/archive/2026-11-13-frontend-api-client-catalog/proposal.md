# C-01 · frontend-api-client-catalog

## Why

El catálogo editorial (`#catalogo` en `frontend/js/catalogo.js`) seguía leyendo el array estático `LIBROS` en memoria (`frontend/js/datos.js`) sin paginación ni consulta a la API. El Ejercicio 1 de la Evaluación Global exige consultar `GET /api/libros/` con filtro `titulo`, `limit` y `offset` (reiniciando el desplazamiento al cambiar el filtro), consultar `GET /api/libros/{id}` para ver los autores de un libro, mostrar `«Sin clasificar»` cuando el género es nulo y diferenciar los estados de carga, lista vacía, búsqueda sin coincidencias y error de conexión (Caso G-01).

## What Changes

- **Catálogo paginado y búsqueda contra la API (`frontend/js/catalogo.js` y `frontend/index.html`)**:
  - Reutilizar `apiFetch` de `frontend/js/api.js` (creado en C-02 con base `/api` y barra final en colecciones) para consumir `GET /api/libros/` enviando `limit` (1 a 100, por defecto 20), `offset` (desde 0) y `titulo` (cuando el texto recortado no sea vacío).
  - Al cambiar el filtro de búsqueda (envío del buscador, escritura o botón «Mostrar todo el catálogo»), reiniciar `offset = 0`.
  - Agregar controles accesibles de paginación (selector de tamaño de página / `limit` con valor por defecto 20 y botones «Página anterior» y «Página siguiente» que actualizan `offset`).
  - Mostrar en cada tarjeta del catálogo: título, ISBN, precio formateado en ARS, editorial y género (`«Sin clasificar»` cuando `genero` es `null`).
  - Diferenciar claramente los 4 estados en `#catalogo-mensaje` (`role="status"`):
    1. **Carga**: mientras se espera la respuesta de `GET /api/libros/`.
    2. **Lista vacía**: cuando no hay filtro activo, `offset === 0` y la API devuelve `[]`.
    3. **Búsqueda sin coincidencias**: cuando hay filtro activo (o página vacía) y la API devuelve `[]`.
    4. **Error de conexión / servidor**: cuando `apiFetch` lanza `ErrorApi`.
- **Consulta de detalle y autores por ID (`GET /api/libros/{id}`)**:
  - Como `GET /api/libros/` (`LibroListado`) no incluye las autorías (`IN-03`), cada tarjeta incluye un botón «Ver autores» (consulta de detalle) que invoca `GET /api/libros/{id}` (`LibroDetalle`) y muestra los autores ordenados por `orden` con su `rol` (`autor`, `coautor`, `traductor`, `ilustrador`) dentro de la tarjeta y/o panel de detalle, diferenciando carga y error si el libro ya no existe.
- **Sincronización con altas (`libros-actualizados`)**:
  - Escuchar el evento `libros-actualizados` emitido por `#form-libro` (C-02) para refrescar el catálogo desde la API conservando el filtro actual.
- **Pruebas y documentación**:
  - Agregar pruebas automatizadas en Node (`node:test` con `fetch` simulado) cubriendo carga inicial con `limit=20&offset=0`, búsqueda por `titulo`, reinicio de `offset` al cambiar filtro, avance/retroceso de página, etiqueta `«Sin clasificar»`, consulta `GET /api/libros/{id}` para ver autores, y los 4 estados (carga, vacío, sin coincidencias, error de conexión).

## Capabilities

### New Capabilities
- `catalogo-frontend`: Consulta del catálogo editorial contra `GET /api/libros/` con búsqueda parcial por `titulo`, paginación (`limit` y `offset`), estados diferenciados de interfaz y consulta de detalle y autores mediante `GET /api/libros/{id}`.

### Modified Capabilities

*(Ninguna especificación existente cambia sus requisitos).*

## Impact

- **Código afectado**: `frontend/index.html`, `frontend/css/styles.css`, `frontend/js/catalogo.js`, `frontend/README.md` y suite de tests en `frontend/tests/`.
- **APIs consumidas**: `GET /api/libros/` (`titulo`, `limit`, `offset`) y `GET /api/libros/{id}`.
- **Compatibilidad**: Se mantienen las funciones puras usadas por las pruebas de regresión heredadas (`normalizarBusqueda`, `filtrarPorTitulo`, `validarRelacionesLibros`) mientras que la vista `#catalogo` pasa a operar íntegramente contra la API REST.
