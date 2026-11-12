# Tasks · C-02 frontend-altas-integration

## 1. Cliente HTTP
- [x] 1.1 Crear `frontend/js/api.js` con `apiFetch`, `ErrorApi` y la traducción de 409/422.
- [x] 1.2 Cargarlo en `index.html` antes de `catalogo.js`, `libros.js` y `clientes.js`.

## 2. Alta de libros
- [x] 2.1 Cargar editoriales, géneros y autores desde la API (DD-01).
- [x] 2.2 Casillas de autores con rol; verificación `GET /autores/{id}` al marcar; orden por marcado.
- [x] 2.3 Campo stock y validaciones del contrato `LibroCreate`.
- [x] 2.4 `POST /api/libros/`; 201 → tabla, reset y `libros-actualizados` con `detail`.
- [x] 2.5 409/422 → mensaje del servidor y borrador intacto (RN-UI-01).

## 3. Alta de clientes
- [x] 3.1 `POST /api/clientes/` con `{nombre, email}`; 201 → tabla, reset y `clientes-actualizados`.
- [x] 3.2 409/422 → mensaje del servidor y borrador intacto.
- [x] 3.3 Búsqueda por id con `GET /api/clientes/{id}`.

## 4. Pruebas y documentación
- [x] 4.1 Tests con `fetch` simulado: contrato, 201, 409, 422, sin conexión, autores (`tests/coordinacion.test.cjs`, `tests/baseline.test.cjs`).
- [x] 4.2 Documentar en `frontend/README.md` la opción elegida para los selectores.
- [ ] 4.3 Verificar G-02, G-03 y G-04 contra el backend real (`seed.py` + Nginx) antes de archivar.
