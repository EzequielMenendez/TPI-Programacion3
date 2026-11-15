# Evidencia · Caso G-01: Catálogo, Búsqueda Parcial, Paginación y Detalle

## Objetivo de la Consigna
> Buscar por título, avanzar con `limit` y `offset` y probar una búsqueda sin coincidencias. Abrir el detalle de un libro. Si el género es nulo, mostrar «Sin clasificar».

---

## 1. Carga Inicial y Etiqueta «Sin clasificar»

- **Petición emitida por el frontend**:
  ```http
  GET /api/libros/?limit=20&offset=0 HTTP/1.1
  Accept: application/json
  ```
- **Respuesta del servidor (`200 OK`)**:
  ```json
  [
    {
      "id": 1,
      "isbn": "978-950-07-0386-1",
      "titulo": "Rayuela",
      "precio": "25000.00",
      "stock": 10,
      "editorial": { "id": 1, "nombre": "Sudamericana", "pais": "Argentina" },
      "genero": { "id": 1, "nombre": "Novela" }
    },
    {
      "id": 5,
      "isbn": "978-950-04-0002-6",
      "titulo": "Antología de la literatura fantástica",
      "precio": "30000.00",
      "stock": 3,
      "editorial": { "id": 3, "nombre": "Emecé", "pais": "Argentina" },
      "genero": null
    }
  ]
  ```
- **Resultado observado en la interfaz**:
  - Se renderizan las 5 tarjetas iniciales usando `textContent`.
  - En el libro 5 (*Antología de la literatura fantástica*), donde `genero` es `null`, la etiqueta y el dato de género muestran **«Sin clasificar»**.
  - El mensaje de estado informa: `Mostrando 1–5 (5 libros en esta página).`

---

## 2. Búsqueda Parcial Insensible a Mayúsculas (`titulo=RAYU`)

- **Pasos ejecutados**: escribir `"RAYU"` en el campo `#catalogo-busqueda`.
- **Petición emitida (con reinicio de `offset=0`)**:
  ```http
  GET /api/libros/?limit=20&offset=0&titulo=RAYU HTTP/1.1
  ```
- **Respuesta del servidor (`200 OK`)**:
  ```json
  [
    {
      "id": 1,
      "isbn": "978-950-07-0386-1",
      "titulo": "Rayuela",
      "precio": "25000.00",
      "stock": 10,
      "editorial": { "id": 1, "nombre": "Sudamericana", "pais": "Argentina" },
      "genero": { "id": 1, "nombre": "Novela" }
    }
  ]
  ```
- **Resultado observado en la interfaz**:
  - Se filtra la lista mostrando únicamente *Rayuela* ($ 25.000,00).
  - El mensaje de estado indica: `1 libro para «RAYU» (1–1).`

---

## 3. Paginación con `limit` y `offset`

- **Pasos ejecutados**: limpiar el filtro, seleccionar `limit = 2` y pulsar el botón **«Siguiente»**.
- **Petición emitida**:
  ```http
  GET /api/libros/?limit=2&offset=2 HTTP/1.1
  ```
- **Resultado observado en la interfaz**:
  - La grilla muestra los libros 3 (*Ficciones*) y 4 (*Respiración artificial*).
  - El indicador de página muestra `Página 2 (desde 3)` y el estado informa `Mostrando 3–4 (2 libros en esta página).`
  - Al cambiar nuevamente el texto de búsqueda, `offset` se reinicia automáticamente a `0`.

---

## 4. Búsqueda sin Coincidencias

- **Pasos ejecutados**: ingresar `"inexistente"` en el buscador.
- **Petición emitida**:
  ```http
  GET /api/libros/?limit=20&offset=0&titulo=inexistente HTTP/1.1
  ```
- **Respuesta del servidor (`200 OK`)**: `[]`
- **Resultado observado en la interfaz**:
  - Se diferencia de la lista vacía general mostrando el mensaje: `No se encontraron libros cuyo título contenga «inexistente».`

---

## 5. Apertura del Detalle de un Libro (`GET /api/libros/{id}`)

- **Pasos ejecutados**: hacer clic en **«Ver autores»** sobre la tarjeta del libro 5 (*Antología de la literatura fantástica*).
- **Petición emitida**:
  ```http
  GET /api/libros/5 HTTP/1.1
  ```
- **Respuesta del servidor (`200 OK`)**:
  ```json
  {
    "id": 5,
    "isbn": "978-950-04-0002-6",
    "titulo": "Antología de la literatura fantástica",
    "precio": "30000.00",
    "stock": 3,
    "editorial": { "id": 3, "nombre": "Emecé", "pais": "Argentina" },
    "genero": null,
    "autores": [
      { "autor_id": 5, "nombre": "Jorge Luis Borges", "nacionalidad": "argentina", "rol": "autor", "orden": 1 },
      { "autor_id": 4, "nombre": "Silvina Ocampo", "nacionalidad": "argentina", "rol": "coautor", "orden": 2 },
      { "autor_id": 3, "nombre": "Adolfo Bioy Casares", "nacionalidad": "argentina", "rol": "coautor", "orden": 3 }
    ]
  }
  ```
- **Resultado observado en la interfaz**:
  - La tarjeta actualiza el campo **Autores** mostrando: `Jorge Luis Borges (autor), Silvina Ocampo (coautor), Adolfo Bioy Casares (coautor)`.
