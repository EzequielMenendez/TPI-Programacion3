# Flujos Principales

Este documento describe los flujos de interacción extremo a extremo entre el Usuario/Navegador, el Reverse Proxy Nginx, el Backend FastAPI y la Base de Datos PostgreSQL 16.

---

## Flujo 1: Consulta y Búsqueda en el Catálogo Editorial

**Disparador**: El usuario ingresa a la aplicación o tipea en el buscador por título.  
**Actor**: Operador de Librería / Evaluador.

### Secuencia de Pasos
1. El navegador emite una petición asincrónica `fetch('/api/libros/?limit=20&offset=0')` (o con `&titulo=...`).
2. Nginx recibe la solicitud en `/api/libros/`, remueve el prefijo `/api` mediante la directiva `proxy_pass http://${API_UPSTREAM}/;` y reenvía `GET /libros/?limit=20&offset=0` al backend FastAPI.
3. El router de `libros` invoca a `service.listar()`.
4. El servicio ejecuta una consulta SQL con `joinedload(Libro.editorial)` y `joinedload(Libro.genero)` aplicando `lazy="raise"` (inmune a consultas N+1).
5. Si viaja el parámetro `titulo`, se aplica `ILIKE %titulo%` con parámetros ligados seguros.
6. La base devuelve los registros; FastAPI valida y serializa con el DTO `LibroListado`.
7. Nginx devuelve el JSON al navegador.
8. El frontend procesa la respuesta:
   - Formatea el precio a moneda nacional con dos decimales (`$ 25.000,00`).
   - Si `genero` es `null`, inserta la etiqueta `"Sin clasificar"`.
   - Genera dinámicamente las tarjetas en el DOM utilizando `textContent`.

### Diagrama de Secuencia

```
Navegador (JS)          Nginx (:80)            FastAPI (:8000)        PostgreSQL (:5432)
     │                       │                        │                       │
     │ GET /api/libros/?titulo=rayu                   │                       │
     ├──────────────────────►│                        │                       │
     │                       │ GET /libros/?titulo=rayu                       │
     │                       ├───────────────────────►│                       │
     │                       │                        │ SELECT ... FROM libro │
     │                       │                        │ JOIN editorial ...    │
     │                       │                        │ WHERE titulo ILIKE $1 │
     │                       │                        ├──────────────────────►│
     │                       │                        │◄──────────────────────┤
     │                       │                        │ (Resultados SQL)      │
     │                       │◄───────────────────────┤                       │
     │                       │ 200 OK [JSON libros]   │                       │
     │◄──────────────────────┤                        │                       │
     │ 200 OK [JSON]         │                        │                       │
(Renderiza tarjetas en DOM)  │                        │                       │
```

---

## Flujo 2: Alta Atómica de Libro con Autorías Múltiples

**Disparador**: El usuario completa el formulario `#form-libro` y presiona "Agregar libro".  
**Actor**: Operador de Librería.

### Secuencia de Pasos
1. El usuario completa los datos en el formulario: título, ISBN, precio, editorial, género y selecciona autor(es) asignando su rol (`autor`, `coautor`, etc.) y orden.
2. Al enviar, el handler intercepta con `event.preventDefault()`.
3. El frontend envía `POST /api/libros/` con el payload JSON correspondiente al esquema `LibroCreate`.
4. Nginx reenvía la petición a FastAPI en `POST /libros/`.
5. FastAPI valida los tipos y restricciones con Pydantic (`LibroCreate`):
   - Si algún dato no cumple el contrato (ej. precio negativo, ISBN mal formado), responde **422 Unprocessable Entity**.
6. El servicio inicia una transacción asincrónica en PostgreSQL (`async with session.begin()`):
   - Intenta insertar el `Libro` y cada uno de los `LibroAutor` asociados.
   - Si el ISBN ya existe, la base dispara la restricción `uq_libro_isbn`. El servicio captura el `IntegrityError` y lo traduce a **409 Conflict** (`"Ya existe un libro con ese ISBN."`).
   - Si la editorial o algún autor no existen, la FK restrictiva salta y se traduce a **409 Conflict**.
   - Si todo es correcto, la transacción hace commit y devuelve el `LibroDetalle` con código **201 Created**.
7. Nginx devuelve la respuesta HTTP al navegador:
   - **Caso 201 Created**: El frontend limpia el formulario (`RN-UI-02`), muestra un mensaje de éxito, actualiza la tabla de libros, refresca el catálogo y añade el nuevo libro al selector de Ventas (`RN-UI-04`).
   - **Caso 409 / 422**: El frontend **conserva el borrador intacto en pantalla (`RN-UI-01`)** y despliega el mensaje de error con `role="alert"`. El usuario corrige el error y reenvía.

### Diagrama de Secuencia

```
Navegador (JS)          Nginx (:80)            FastAPI (:8000)        PostgreSQL (:5432)
     │                       │                        │                       │
     │ POST /api/libros/     │                        │                       │
     │ (Payload LibroCreate) │                        │                       │
     ├──────────────────────►│                        │                       │
     │                       │ POST /libros/          │                       │
     │                       ├───────────────────────►│                       │
     │                       │                        │ BEGIN TRANSACTION     │
     │                       │                        │ INSERT INTO libro ... │
     │                       │                        │ INSERT INTO libro_autor
     │                       │                        ├──────────────────────►│
     │                       │                        │                       │
     │                       │                        │◄──────────────────────┤
     │                       │                        │ COMMIT / (o Error)    │
     │                       │◄───────────────────────┤                       │
     │                       │ 201 Created / 409 Conf │                       │
     │◄──────────────────────┤                        │                       │
     │ 201 Created / 409     │                        │                       │
     │                       │                        │                       │
[Si 201: limpia form y       │                        │                       │
 actualiza vistas]           │                        │                       │
[Si 409: CONSERVA borrador   │                        │                       │
 y muestra alerta]           │                        │                       │
```

---

## Flujo 3: Registro Transaccional de Venta y Congelamiento de Precios

**Disparador**: El usuario selecciona un cliente, añade renglones de libros con cantidades y presiona "Confirmar venta".  
**Actor**: Operador de Librería.

### Secuencia de Pasos
1. El usuario arma la venta en pantalla seleccionando el cliente y agregando libros y cantidades.
2. El frontend valida localmente que haya al menos un renglón y que no haya libros repetidos.
3. El frontend despacha `POST /api/ventas/` con el siguiente cuerpo estricto:
   ```json
   {
     "cliente_id": 2,
     "renglones": [
       { "libro_id": 1, "cantidad": 2 },
       { "libro_id": 4, "cantidad": 1 }
     ]
   }
   ```
   *(Nota: Prohibido enviar `precio_unitario` o `total`; `extra="forbid"` respondería 422)*.
4. Nginx rutea la petición a FastAPI en `POST /ventas/`.
5. El servicio de ventas de FastAPI abre una transacción de base de datos:
   - Bloquea los registros de los libros involucrados mediante `SELECT ... FROM libro WHERE id IN (...) FOR UPDATE`. Esto garantiza consistencia ante concurrencia.
   - Verifica que el cliente exista en la base (si no, responde 409).
   - Verifica que el stock de cada libro sea suficiente (`stock >= cantidad`). Si algún libro no tiene stock, la restricción `ck_libro_stock_no_negativo` salta y el servicio responde 409 Conflict.
   - **Snapshot de precio**: Copia el precio actual de cada libro en `renglon_venta.precio_unitario` (ej. 25000.00 y 27000.00).
   - **Cálculo de total**: Calcula en el servidor: `(25000.00 * 2) + (27000.00 * 1) = 77000.00`.
   - Descuenta el stock en los registros de libro (`stock = stock - cantidad`).
   - Inserta la cabecera `venta` y los registros `renglon_venta`.
   - Confirma la transacción con `commit()`.
6. FastAPI agenda en `BackgroundTasks` la tarea asincrónica de notificación de comprobante por email (`asyncio.sleep(0.5)` y registro en log).
7. FastAPI retorna la respuesta **HTTP 201 Created** con el objeto `VentaRead`.
8. Nginx transmite el 201 al navegador.
9. El frontend:
   - Limpia de inmediato el borrador de venta (`RN-UI-02`).
   - Presenta un mensaje de éxito destacando el ID de venta y el importe total.
   - Si hubiera ocurrido un error 409 (ej. stock insuficiente), el frontend **mantiene todo el borrador intacto** para que el operador ajuste cantidades (`RN-UI-01`).

### Diagrama de Secuencia

```
Navegador (JS)          Nginx (:80)            FastAPI (:8000)        PostgreSQL (:5432)
     │                       │                        │                       │
     │ POST /api/ventas/     │                        │                       │
     │ {cliente_id, renglones}                        │                       │
     ├──────────────────────►│                        │                       │
     │                       │ POST /ventas/          │                       │
     │                       ├───────────────────────►│                       │
     │                       │                        │ BEGIN                 │
     │                       │                        │ SELECT ... FOR UPDATE │
     │                       │                        ├──────────────────────►│
     │                       │                        │◄──────────────────────┤
     │                       │                        │ (Verifica stock y copia precios)
     │                       │                        │ UPDATE libro SET stock...
     │                       │                        │ INSERT venta, renglones
     │                       │                        ├──────────────────────►│
     │                       │                        │◄──────────────────────┤
     │                       │                        │ COMMIT                │
     │                       │                        │                       │
     │                       │                        │ ──┐ (Despacha tarea   │
     │                       │                        │   │ BackgroundTasks   │
     │                       │                        │ ◄─┘ comprobante email)│
     │                       │◄───────────────────────┤                       │
     │                       │ 201 Created [VentaRead]│                       │
     │◄──────────────────────┤                        │                       │
     │ 201 Created           │                        │                       │
(Limpia borrador y           │                        │                       │
 muestra confirmación)       │                        │                       │
```

---

## Flujo 4: Prueba Pedagógica de Inmutabilidad de Precios Históricos (Caso G-06)

**Disparador**: El evaluador o librero modifica el precio de un libro en el catálogo mediante `PATCH /api/libros/{id}` y luego consulta una venta pasada.  
**Actor**: Evaluador Académico / Auditor.

### Secuencia de Pasos
1. Se consulta el catálogo inicial: El libro 1 (Rayuela) cuesta `$ 25.000,00`.
2. Se registra y confirma una venta donde se compra Rayuela (Venta con ID X). El renglón guarda `precio_unitario = 25000.00`.
3. Se ejecuta una actualización de precio sobre el libro:
   `PATCH /api/libros/1` con `{"precio": "35000.00"}`.
4. El backend actualiza la columna `precio` en la tabla `libro` a `35000.00` y responde HTTP 200 OK.
5. El catálogo se refresca y ahora muestra a Rayuela con su nuevo valor: `$ 35.000,00`.
6. El usuario se traslada a la sección `#historial` y hace clic en "Ver detalle" de la Venta X.
7. El navegador solicita `GET /api/ventas/{id}`.
8. El backend lee la tabla `renglon_venta` mediante `selectinload`. Como el valor de `precio_unitario` en `renglon_venta` fue congelado en el momento de la confirmación original, devuelve:
   - `precio_unitario: "25000.00"`
   - `subtotal: "50000.00"` (para cantidad 2)
   - `total: "77000.00"`
9. El frontend renderiza la venta con los valores históricos intactos, demostrando inmutabilidad contable ante cambios en el catálogo maestro.

---

## Flujo 5: Ruteo y Reescritura del Reverse Proxy Nginx

**Disparador**: Toda petición enviada por el navegador a la aplicación.  
**Actor**: Infraestructura Nginx.

### Secuencia de Pasos
1. Una petición llega a `http://<dominio-easypanel>/...`.
2. Nginx evalúa la URI:
   - **Caso Archivo Estático (`/`, `/css/*`, `/js/*`)**:
     Coincide con `location /`. Nginx busca el archivo en `/usr/share/nginx/html/` y lo sirve inmediatamente con los tipos MIME adecuados (`text/html`, `text/css`, `application/javascript`).
   - **Caso Llamada a la API (`/api/*`)**:
     Coincide con `location /api/`.
     Nginx aplica la directiva:
     ```nginx
     location /api/ {
         proxy_pass http://${API_UPSTREAM}/;
         proxy_set_header Host $host;
         proxy_set_header X-Real-IP $remote_addr;
         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
         proxy_set_header X-Forwarded-Proto $scheme;
     }
     ```
3. Nginx reescribe la ruta:
   - Petición cliente: `http://localhost/api/libros/?limit=20`
   - Reenvío upstream: `http://backend:8000/libros/?limit=20`
4. FastAPI recibe la petición en `/libros/` sin prefijo artificial y sin necesidad de configurar middleware de CORS.
