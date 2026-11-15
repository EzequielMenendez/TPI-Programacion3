# Evidencia · Caso G-03: Alta de Cliente, Consulta por ID y Rechazo de Email Repetido (409)

## Objetivo de la Consigna
> Crear un cliente y recuperarlo por ID. Repetir el email y verificar el `409`.

---

## 1. Alta Válida de Cliente (`POST /api/clientes/` → `201 Created`)

- **Petición emitida**:
  ```http
  POST /api/clientes/ HTTP/1.1
  Content-Type: application/json

  {
    "nombre": "Lucía Gómez",
    "email": "Lucia.Gomez@Example.com"
  }
  ```
- **Respuesta del servidor (`201 Created`)** *(email normalizado a minúsculas por el backend)*:
  ```json
  {
    "id": 3,
    "nombre": "Lucía Gómez",
    "email": "lucia.gomez@example.com",
    "perfil": null
  }
  ```
- **Resultado observado en la interfaz**:
  - El formulario `#form-cliente` se vacía.
  - Se muestra el mensaje `#clientes-mensaje`: `Cliente «Lucía Gómez» dado de alta con el id 3 (lucia.gomez@example.com).`
  - Se agrega la fila a la tabla de clientes y se emite `clientes-actualizados`, incorporando a Lucía Gómez al selector de Ventas sin perder borradores en curso.

---

## 2. Recuperación de Cliente por ID (`GET /api/clientes/{id}`)

- **Pasos ejecutados**: ingresar `3` en el campo `#cliente-buscar-id` y pulsar **«Buscar cliente»**.
- **Petición emitida**:
  ```http
  GET /api/clientes/3 HTTP/1.1
  ```
- **Respuesta del servidor (`200 OK`)**:
  ```json
  {
    "id": 3,
    "nombre": "Lucía Gómez",
    "email": "lucia.gomez@example.com",
    "perfil": null
  }
  ```
- **Resultado observado en la interfaz**:
  - En `#cliente-buscar-resultado` se muestra: `Cliente #3: Lucía Gómez (lucia.gomez@example.com).`

---

## 3. Rechazo por Email Repetido (`409 Conflict`) y Preservación del Borrador

- **Pasos ejecutados**: ingresar el nombre `"Otra Ana"` y el email `"ANA@example.com"` (repetido de `ana@example.com`).
- **Petición emitida**:
  ```http
  POST /api/clientes/ HTTP/1.1
  Content-Type: application/json

  {
    "nombre": "Otra Ana",
    "email": "ANA@example.com"
  }
  ```
- **Respuesta del servidor (`409 Conflict`)**:
  ```json
  {
    "detail": "Ya existe un cliente con ese email."
  }
  ```
- **Resultado observado en la interfaz**:
  - En `#clientes-errores` (`role="alert"`) se muestra: **`Ya existe un cliente con ese email.`**
  - El campo `#cliente-email` recibe `aria-invalid="true"`.
  - **El borrador se conserva intacto**: el valor `"Otra Ana"` y el email ingresado permanecen en los inputs.
