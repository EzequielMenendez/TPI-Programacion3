# Diseño · C-01 frontend-api-client-catalog

## Context

El cliente HTTP centralizado (`frontend/js/api.js` con `apiFetch`, `ErrorApi` y `mensajesDeError`) ya fue incorporado en `C-02`. Sin embargo, `frontend/js/catalogo.js` todavía renderiza el array local `LIBROS` de `datos.js` sin realizar peticiones HTTP. Además, en el contrato del backend (`backend/app/modules/libros/schemas.py`), `GET /libros/` devuelve `list[LibroListado]` (con `id`, `isbn`, `titulo`, `precio`, `stock`, `editorial`, `genero`) sin el campo `autores`, mientras que `GET /libros/{id}` devuelve `LibroDetalle` incluyendo `autores: list[AutoriaRead]` (`autor_id`, `nombre`, `rol`, `orden`).

## Goals / Non-Goals

**Goals:**
- Conectar `#catalogo` a `GET /api/libros/` con `titulo`, `limit` (1..100, default 20) y `offset` (>= 0), reiniciando `offset = 0` al cambiar el filtro o el `limit`.
- Consultar `GET /api/libros/{id}` bajo demanda desde cada tarjeta del catálogo para mostrar los autores con su rol y orden (y el stock disponible en el detalle).
- Diferenciar explícitamente los 4 estados exigidos por el Ejercicio 1: carga, lista vacía, búsqueda sin coincidencias y error de conexión.
- Preservar las funciones puras heredadas (`normalizarBusqueda`, `filtrarPorTitulo`, `validarRelacionesLibros`, `buscarPorId`) para no romper las suites existentes (`baseline.test.cjs`, `persistencia.test.cjs`).

**Non-Goals:**
- Modificar los formularios de alta de libros y clientes (ya implementados en `C-02`).
- Conectar la sección de ventas e historial (`C-03`).
- Mover archivos a `frontend/public/` o crear el `Dockerfile` de Nginx (`C-04`).

## Decisions

1. **Estado de paginación y filtro en `catalogo.js`**:
   - Mantener un estado del catálogo `{ titulo: "", limit: 20, offset: 0, cargando: false }` y un contador de petición (`secuenciaCatalogo`) para descartar respuestas obsoletas si el usuario cambia rápido el filtro.
   - Armar los query params para `apiFetch("/libros/", { parametros })` enviando siempre `{ limit, offset }` y sumando `titulo` solo cuando `titulo.trim() !== ""`.
   - Al cambiar el texto de búsqueda, enviar el formulario, limpiar la búsqueda o cambiar `limit`, reiniciar `offset = 0` antes de llamar a `cargarCatalogo()`.
   - Habilitar «Página anterior» cuando `offset > 0` (`offset = Math.max(0, offset - limit)`) y «Página siguiente» cuando la página actual devolvió `libros.length === limit` (`offset = offset + limit`).

2. **Consulta de detalle y autores con `GET /api/libros/{id}`**:
   - En cada tarjeta (`crearTarjetaLibroApi(libro)`), mostrar de inmediato `ISBN`, `Editorial` (`libro.editorial.nombre`), `Género` (`libro.genero ? libro.genero.nombre : "Sin clasificar"`) y `Precio` (`formatoPrecio.format(Number(libro.precio))`).
   - Incluir en la tarjeta la fila `Autores` con un texto inicial (`"Consultá el detalle para ver los autores"`) y un botón accesible `Ver detalle y autores` (`data-libro-id`).
   - Al pulsar el botón, deshabilitarlo mientras se ejecuta `apiFetch(\`/libros/${libro.id}\`)` y al resolver actualizar la fila `Autores` con `describirAutorias(detalle.autores)` (ordenado por `orden`, ej. `"Julio Cortázar (autor)"`) y mostrar también el `Stock` del detalle. Si falla (`404` o sin conexión), mostrar el mensaje de error en la tarjeta sin afectar las demás tarjetas.

3. **Cuatro estados diferenciados en `#catalogo-mensaje`**:
   - **Carga**: `"Cargando catálogo…"` (clase `.message--info`).
   - **Error de conexión / API**: texto devuelto por `mensajesDeError(error)` (clase `.message--warning`).
   - **Lista vacía** (`libros.length === 0`, `termino === ""` y `offset === 0`): `"Todavía no hay libros cargados en el catálogo."` (`.message--info`).
   - **Búsqueda sin coincidencias** (`libros.length === 0` con `termino !== ""`): ``Sin resultados: ningún título contiene «${termino}». Probá con otra palabra o borrá la búsqueda.`` (`.message--warning`). Si `offset > 0` y la página viene vacía: `"No hay más libros en esta página."` (`.message--info`).

4. **Sincronización con `libros-actualizados` (C-02)**:
   - Escuchar `document.addEventListener("libros-actualizados", ...)` para volver a consultar `cargarCatalogo()` y reflejar inmediatamente el nuevo libro dado de alta.

## UI Mockups

Decision: no (project policy `visual_design.mode = "off"`). Se reutilizan las clases existentes `.card`, `.book-card`, `.search__controls`, `.button` y `.message` de `frontend/css/styles.css`.

## Risks / Trade-offs

- **[Risk] Suites de tests heredadas (`baseline.test.cjs`, `persistencia.test.cjs`) invocan `filtrarPorTitulo` y `validarRelacionesLibros` en VM sin `fetch`** → **Mitigation**: conservar esas funciones puras en `catalogo.js` y hacer que `iniciarCatalogo()` opere contra `apiFetch` cuando los nodos del DOM del catálogo existen.
