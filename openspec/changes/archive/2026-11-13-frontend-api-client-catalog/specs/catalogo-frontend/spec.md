# Spec Delta

## Purpose

Especifica el comportamiento del catálogo editorial en el frontend cuando consulta `GET /api/libros/` con búsqueda parcial por título, paginación con `limit` y `offset`, estados diferenciados de interfaz y consulta del detalle y autores de un libro mediante `GET /api/libros/{id}` (Global · Ejercicio 1 · Caso G-01).

## ADDED Requirements

### Requirement: Consulta paginada del catálogo contra la API
El catálogo MUST consultar `GET /api/libros/` mediante `apiFetch` enviando `limit` (entre 1 y 100, por defecto 20) y `offset` (entero desde 0).

#### Scenario: Carga inicial por defecto
- **WHEN** se inicia la sección de catálogo sin filtro
- **THEN** se hace `GET /api/libros/?limit=20&offset=0` y se dibujan las tarjetas devueltas

#### Scenario: Avance y retroceso de página
- **WHEN** el usuario avanza a la página siguiente con `limit=20` y luego vuelve a la página anterior
- **THEN** se consulta primero `GET /api/libros/?limit=20&offset=20` y luego `GET /api/libros/?limit=20&offset=0`

### Requirement: Búsqueda parcial por título y reinicio del desplazamiento
Al buscar por título el catálogo MUST enviar `titulo` recortado a `GET /api/libros/` y MUST reiniciar `offset` a `0` cada vez que cambia el filtro o el límite por página.

#### Scenario: Cambio de filtro estando en otra página
- **WHEN** el usuario está en `offset=20` y busca `"viento"`
- **THEN** el desplazamiento vuelve a `0` y se hace `GET /api/libros/?limit=20&offset=0&titulo=viento`

#### Scenario: Limpiar búsqueda restaura el listado desde el inicio
- **WHEN** el usuario pulsa «Mostrar todo el catálogo»
- **THEN** el campo de búsqueda se vacía, `offset` vuelve a `0` y se consulta `GET /api/libros/?limit=20&offset=0`

### Requirement: Datos de tarjeta y género nulo
Cada tarjeta del catálogo MUST mostrar título, ISBN, precio en ARS, editorial y género con `textContent`, y MUST mostrar `«Sin clasificar»` cuando `genero` sea `null`.

#### Scenario: Libro con género nulo
- **WHEN** la API devuelve un libro con `genero: null` y `editorial: { nombre: "Sur" }`
- **THEN** la tarjeta muestra la etiqueta y el dato `Sin clasificar` y la editorial `Sur`

### Requirement: Consulta de autores por ID del libro
Para ver los autores de un libro del catálogo el frontend MUST consultar `GET /api/libros/{id}` y mostrar los autores ordenados por `orden` con su `rol`.

#### Scenario: Ver detalle y autores de un libro
- **WHEN** el usuario solicita ver los autores del libro con `id: 4`
- **THEN** se hace `GET /api/libros/4` y se muestran sus autores ordenados por `orden` junto con su rol

#### Scenario: Libro inexistente al abrir el detalle
- **WHEN** `GET /api/libros/4` responde `404` o falla la red
- **THEN** se muestra el mensaje de error correspondiente sin romper el resto del catálogo

### Requirement: Diferenciación de estados del catálogo
El catálogo MUST diferenciar en su mensaje de estado la carga en curso, la lista vacía, la búsqueda sin coincidencias y el error de conexión.

#### Scenario: Lista vacía sin filtro
- **WHEN** `GET /api/libros/?limit=20&offset=0` sin `titulo` devuelve `[]`
- **THEN** se informa que todavía no hay libros cargados en el catálogo

#### Scenario: Búsqueda sin coincidencias
- **WHEN** `GET /api/libros/?limit=20&offset=0&titulo=zzzz` devuelve `[]`
- **THEN** se informa que ningún título coincide con `«zzzz»`

#### Scenario: Error de conexión
- **WHEN** falla la red al consultar `GET /api/libros/`
- **THEN** se vacía la grilla y se muestra el mensaje de error de conexión en el estado del catálogo
