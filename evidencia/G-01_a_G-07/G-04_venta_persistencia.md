# Evidencia · Caso G-04: Registro de Venta con Dos Renglones (201) y Persistencia tras Recarga

## Objetivo de la Consigna
> Registrar una venta válida con dos renglones. Verificar `201` y consultar el detalle después de recargar.

---

## 1. Armado y Envío de la Venta (`POST /api/ventas/`)

- **Pasos ejecutados**:
  1. Seleccionar el cliente `2` (*Tomás Ríos*).
  2. Agregar el libro `1` (*Rayuela*, $ 25.000,00) con cantidad `2`.
  3. Agregar el libro `4` (*Respiración artificial*, $ 27.000,00) con cantidad `1`.
  4. Pulsar **«Confirmar venta»** (el botón se deshabilita mientras se procesa el envío).
- **Petición emitida** *(únicamente `cliente_id` y `renglones` con `libro_id` y `cantidad`)*:
  ```http
  POST /api/ventas/ HTTP/1.1
  Content-Type: application/json

  {
    "cliente_id": 2,
    "renglones": [
      { "libro_id": 1, "cantidad": 2 },
      { "libro_id": 4, "cantidad": 1 }
    ]
  }
  ```
- **Respuesta del servidor (`201 Created`)**:
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
- **Resultado observado en la interfaz y en el servidor**:
  - Se muestra el mensaje de confirmación con el ID de la venta (`#2`), el cliente (`Tomás Ríos`), los precios unitarios copiados del catálogo (`$ 25.000,00` y `$ 27.000,00`), los subtotales (`$ 50.000,00` y `$ 27.000,00`) y el total calculado por la API (`$ 77.000,00`).
  - El borrador de la venta se limpia por completo.
  - El stock de *Rayuela* baja de `10` a `8` y el de *Respiración artificial* baja de `6` a `5`.
  - En el log del backend (~0,5 s después via `BackgroundTasks`) se registra: `Comprobante de la venta 2 enviado a tomas@example.com`.

---

## 2. Verificación de Persistencia tras Recargar la Página (`GET /api/ventas/{id}`)

- **Pasos ejecutados**: recargar la página completa en el navegador (`F5`), dirigirse a la sección **Historial** y pulsar **«Ver detalle»** en la venta `#2`.
- **Peticiones emitidas**:
  ```http
  GET /api/ventas/?limit=20&offset=0 HTTP/1.1
  GET /api/ventas/2 HTTP/1.1
  ```
- **Resultado observado**:
  - La API devuelve desde PostgreSQL la misma venta `#2` con fecha, cliente *Tomás Ríos*, los dos renglones (*Rayuela* $\times 2$ a `$ 25.000,00` = `$ 50.000,00` y *Respiración artificial* $\times 1$ a `$ 27.000,00` = `$ 27.000,00`) y el total `$ 77.000,00`.
