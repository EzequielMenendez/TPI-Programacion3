# Evidencia · Caso G-02: Alta de Libro, Detalle y Rechazo de ISBN Repetido (409)

## Objetivo de la Consigna
> Crear un libro con stock, género opcional y autorías. Consultar el detalle. Repetir el ISBN y verificar el `409`.

---

## 1. Carga de Selectores y Verificación de Autores por ID

- Al iniciar la vista de **Libros**, el frontend consulta `GET /api/editoriales/?limit=100&offset=0`, `GET /api/generos/?limit=100&offset=0` y `GET /api/autores/?limit=100&offset=0`.
- Al marcar la casilla del autor `1` (Julio Cortázar) y luego la del autor `5` (Jorge Luis Borges) con rol `coautor`, se verifica cada ID individualmente mediante:
  ```http
  GET /api/autores/1 HTTP/1.1
  GET /api/autores/5 HTTP/1.1
  ```
- La lista de autorías conserva el orden de marcado (`orden: 1` y `orden: 2`).

---

## 2. Alta Válida de Libro (`POST /api/libros/` → `201 Created`)

- **Petición emitida**:
  ```http
  POST /api/libros/ HTTP/1.1
  Content-Type: application/json

  {
    "titulo": "Historias de cronopios y de famas",
    "isbn": "978-950-07-1122-4",
    "precio": "19500.00",
    "stock": 4,
    "editorial_id": 1,
    "genero_id": 2,
    "autores": [
      { "autor_id": 1, "rol": "autor", "orden": 1 }
    ]
  }
  ```
- **Respuesta del servidor (`201 Created`)**:
  ```json
  {
    "id": 6,
    "isbn": "978-950-07-1122-4",
    "titulo": "Historias de cronopios y de famas",
    "precio": "19500.00",
    "stock": 4,
    "editorial": { "id": 1, "nombre": "Sudamericana", "pais": "Argentina" },
    "genero": { "id": 2, "nombre": "Cuento" },
    "autores": [
      { "autor_id": 1, "nombre": "Julio Cortázar", "nacionalidad": "argentina", "rol": "autor", "orden": 1 }
    ]
  }
  ```
- **Resultado observado en la interfaz**:
  - El formulario `#form-libro` y las casillas de autores se limpian por completo.
  - Se muestra el mensaje (`#libros-mensaje`): `Libro «Historias de cronopios y de famas» dado de alta con el id 6.`
  - Se actualiza la tabla de libros y se emite el evento `libros-actualizados`, incorporando el libro al catálogo y al selector de Ventas.
  - Al consultar `GET /api/libros/6` desde el catálogo («Ver autores»), se visualiza `Julio Cortázar (autor)` y `Stock: 4 unidades`.

---

## 3. Rechazo por ISBN Repetido (`409 Conflict`) y Preservación del Borrador

- **Pasos ejecutados**: completar el formulario con el ISBN ya existente de *Rayuela* (`978-950-07-0386-1`).
- **Petición emitida**:
  ```http
  POST /api/libros/ HTTP/1.1
  Content-Type: application/json

  {
    "titulo": "Rayuela (reedición)",
    "isbn": "978-950-07-0386-1",
    "precio": "28000.00",
    "stock": 2,
    "editorial_id": 1,
    "genero_id": 1,
    "autores": [
      { "autor_id": 1, "rol": "autor", "orden": 1 }
    ]
  }
  ```
- **Respuesta del servidor (`409 Conflict`)**:
  ```json
  {
    "detail": "Ya existe un libro con ese ISBN."
  }
  ```
- **Resultado observado en la interfaz**:
  - El contenedor `#libros-errores` (`role="alert"`) muestra el mensaje del servidor: **`Ya existe un libro con ese ISBN.`**
  - El campo `#libro-isbn` queda marcado con `aria-invalid="true"`.
  - **El borrador permanece intacto en pantalla**: título, precio, stock, editorial, género y autorías marcadas se conservan sin vaciarse para permitir corregir únicamente el ISBN.
