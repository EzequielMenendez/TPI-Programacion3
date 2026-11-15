# Evidencia · Caso G-05: Inmutabilidad de Precio Histórico tras `PATCH /libros/{id}`

## Objetivo de la Consigna
> Cambiar el precio con `PATCH /libros/{id}` y verificar que la venta anterior conserva sus importes.

---

## 1. Actualización del Precio en el Catálogo (`PATCH /api/libros/1`)

- **Estado previo**: la venta `#2` fue registrada con *Rayuela* (`libro_id = 1`, cantidad `2`) a un precio de catálogo de **`$ 25.000,00`** y un total de **`$ 77.000,00`**.
- **Petición emitida para cambiar el precio de catálogo**:
  ```http
  PATCH /api/libros/1 HTTP/1.1
  Content-Type: application/json

  {
    "precio": "35000.00"
  }
  ```
- **Respuesta del servidor (`200 OK`)**:
  ```json
  {
    "id": 1,
    "isbn": "978-950-07-0386-1",
    "titulo": "Rayuela",
    "precio": "35000.00",
    "stock": 8,
    "editorial": { "id": 1, "nombre": "Sudamericana", "pais": "Argentina" },
    "genero": { "id": 1, "nombre": "Novela" },
    "autores": [
      { "autor_id": 1, "nombre": "Julio Cortázar", "nacionalidad": "argentina", "rol": "autor", "orden": 1 }
    ]
  }
  ```

---

## 2. Verificación de la Venta Anterior (`GET /api/ventas/2`)

- **Petición emitida al abrir el detalle en `#historial`**:
  ```http
  GET /api/ventas/2 HTTP/1.1
  ```
- **Respuesta del servidor (`200 OK`)**:
  ```json
  {
    "id": 2,
    "cliente_id": 2,
    "fecha": "2026-11-14T23:55:00.000000Z",
    "total": "77000.00",
    "cliente": {
      "id": 2,
      "nombre": "Tomás Ríos",
      "email": "tomas@example.com"
    },
    "renglones": [
      {
        "id": 2,
        "libro_id": 1,
        "titulo_libro": "Rayuela",
        "cantidad": 2,
        "precio_unitario": "25000.00",
        "subtotal": "50000.00"
      },
      {
        "id": 3,
        "libro_id": 4,
        "titulo_libro": "Respiración artificial",
        "cantidad": 1,
        "precio_unitario": "27000.00",
        "subtotal": "27000.00"
      }
    ]
  }
  ```
- **Resultado observado en la interfaz**:
  - En el **Catálogo**, *Rayuela* muestra el nuevo precio **`$ 35.000,00`**.
  - En el **Historial**, la venta `#2` conserva de forma inmutable el `precio_unitario` histórico **`$ 25.000,00`**, el subtotal **`$ 50.000,00`** y el total **`$ 77.000,00`** (`renglon_venta.precio_unitario` congelado al momento del alta).
