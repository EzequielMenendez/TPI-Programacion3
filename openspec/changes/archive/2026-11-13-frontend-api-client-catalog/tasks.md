# Tasks · C-01 frontend-api-client-catalog

## 1. Controles HTML y estilos del catálogo paginado

- [x] 1.1 Agregar en `frontend/index.html` (sección `#catalogo`) los controles accesibles de paginación (`#catalogo-limit` con valor por defecto `20`, `#catalogo-anterior`, `#catalogo-siguiente` y `#catalogo-pagina`) y los estilos de apoyo en `frontend/css/styles.css`, verificando con `node --test frontend/tests/interfaz.test.cjs` que los controles estén presentes y etiquetados.

## 2. Catálogo contra `GET /api/libros/` y estados diferenciados

- [x] 2.1 Implementar en `frontend/js/catalogo.js` la construcción de parámetros (`construirParametrosCatalogo`) y la consulta paginada a `GET /api/libros/` con `titulo`, `limit` (1 a 100, por defecto 20) y `offset` (desde 0), reiniciando `offset = 0` al cambiar el filtro o el límite, y verificar con tests en `frontend/tests/catalogo.test.cjs`.
- [x] 2.2 Implementar en `frontend/js/catalogo.js` el renderizado de tarjetas de la API (`crearTarjetaLibroApi` con título, ISBN, precio ARS, editorial y `«Sin clasificar»` cuando `genero` es `null`) y la diferenciación de los 4 estados en `#catalogo-mensaje` (carga, lista vacía, búsqueda sin coincidencias y error de conexión), verificando con tests en `frontend/tests/catalogo.test.cjs`.
- [x] 2.3 Conectar el evento `libros-actualizados` en `frontend/js/catalogo.js` para recargar el catálogo cuando se da de alta un libro y verificar con `node --test frontend/tests/*.test.cjs`.

## 3. Detalle de libro y autores con `GET /api/libros/{id}`

- [x] 3.1 Implementar en `frontend/js/catalogo.js` la acción «Ver detalle y autores» en cada tarjeta para consultar `GET /api/libros/{id}`, mostrar los autores ordenados por `orden` con su `rol` (y manejar error `404` / sin conexión), y verificar con tests en `frontend/tests/catalogo.test.cjs`.
- [x] 3.2 Documentar en `frontend/README.md` la sección `Global · Ejercicio 1 · Catálogo y cliente HTTP` y verificar que la suite completa `node --test frontend/tests/*.test.cjs` pase sin errores.

## Workflow follow-up

- Verificar el Caso G-01 contra el backend real (`seed.py` + Nginx) junto con C-02/C-04 antes de archivar.
