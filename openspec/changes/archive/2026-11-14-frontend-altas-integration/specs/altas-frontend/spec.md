## ADDED Requirements

### Requirement: Cliente HTTP centralizado
El frontend MUST hacer todas las peticiones de altas mediante `apiFetch`, con
prefijo `/api` y barra final en las rutas de colección.

#### Scenario: Alta de libro
- **WHEN** se envía un libro válido
- **THEN** se hace `POST /api/libros/` con cuerpo JSON

#### Scenario: Error de dominio
- **WHEN** la API responde `409 {"detail": "Ya existe un libro con ese ISBN."}`
- **THEN** se muestra exactamente ese texto en el contenedor `role="alert"`

### Requirement: Selectores desde la API (DD-01)
El formulario de libros MUST cargar editoriales, géneros y autores desde
`GET /api/editoriales/`, `GET /api/generos/` y `GET /api/autores/`, y MUST
verificar cada autor con `GET /api/autores/{id}` al marcarlo.

#### Scenario: Autor verificado
- **WHEN** el usuario marca un autor existente con rol `traductor`
- **THEN** se agrega a las autorías con el siguiente número de orden

#### Scenario: Autor inexistente
- **WHEN** `GET /api/autores/{id}` responde 404 al marcarlo
- **THEN** la autoría no se agrega y se informa que el autor ya no existe

### Requirement: Contrato LibroCreate
El alta MUST enviar `titulo`, `isbn`, `precio` (texto decimal), `stock`,
`editorial_id`, `genero_id` (o `null`) y `autores: [{autor_id, rol, orden}]`
con `orden` correlativo desde 1 en el orden de marcado.

#### Scenario: Dos autores
- **WHEN** se marca primero el autor 2 como traductor y luego el 1 como autor
- **THEN** `autores` es `[{autor_id: 2, rol: "traductor", orden: 1}, {autor_id: 1, rol: "autor", orden: 2}]`

### Requirement: Alta de cliente
El alta de clientes MUST enviar solo `{nombre, email}` a `POST /api/clientes/`
y el frontend MUST permitir consultar un cliente con `GET /api/clientes/{id}`.

#### Scenario: Email repetido
- **WHEN** la API responde 409 por email repetido
- **THEN** se muestra el mensaje del servidor y nombre y email quedan cargados

### Requirement: Resultado del alta
Ante 201 el frontend MUST usar el registro devuelto, vaciar el formulario,
agregar la fila a la tabla y emitir `libros-actualizados` /
`clientes-actualizados` con el registro en `detail`. Ante 409 o 422 MUST
conservar todos los datos cargados y no emitir el evento.

#### Scenario: Libro creado
- **WHEN** la API responde 201 con el libro id 9
- **THEN** la tabla suma la fila del id 9, el formulario y las autorías quedan vacíos y se emite un único `libros-actualizados`

#### Scenario: ISBN repetido (G-03)
- **WHEN** la API responde 409
- **THEN** título, precio, stock, editorial, género y autores marcados quedan como estaban
