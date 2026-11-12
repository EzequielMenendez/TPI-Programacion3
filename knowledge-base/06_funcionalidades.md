# Funcionalidades

El sistema organiza sus capacidades funcionales en **5 Épicas**, mapeadas de forma directa a los **Ejercicios 1 al 5** y a los **Casos de prueba G-01 al G-07** de la Evaluación Global de Programación III.

---

## Épica 1: Catálogo Editorial y Búsqueda (Ejercicio 1 · Caso G-01)

### US-001 — Visualización de libros en catálogo paginado
**Como** operador de la librería o evaluador académico,  
**Quiero** visualizar las obras literarias disponibles cargadas desde la API REST,  
**Para** conocer el catálogo vigente, sus precios, editoriales, géneros y autores con sus respectivos roles.

**Criterios de Aceptación**:
- [ ] La interfaz realiza una petición `GET /api/libros/` al iniciar la vista `#catalogo`.
- [ ] Cada tarjeta de libro renderiza: título, ISBN, editorial, precio formateado en ARS (`$ 0,00`), stock disponible y autores.
- [ ] Si un libro no tiene género asignado (`genero: null`), se visualiza explícitamente como `"Sin clasificar"`.
- [ ] Los autores se visualizan en base a la relación `autores`, indicando el rol (`autor`, `coautor`, etc.) según la autoría.
- [ ] Todo el texto se inserta en el DOM mediante `textContent`, evitando inyección de HTML o scripts (XSS).

**Reglas de Negocio Relacionadas**: `RN-LIB-02`, `RN-LIB-04`, `RN-LIB-05`, `RN-LIB-06`, `RN-LIB-07`, `RN-DEP-01`.

---

### US-002 — Búsqueda por título en tiempo real (Caso G-01)
**Como** librero,  
**Quiero** buscar libros por coincidencia parcial de su título sin importar mayúsculas ni espacios,  
**Para** localizar rápidamente un ejemplar mientras atiendo a un cliente.

**Criterios de Aceptación**:
- [ ] El buscador envía el parámetro de consulta `GET /api/libros/?titulo={texto}` al backend.
- [ ] Búsquedas con mayúsculas (ej. `"RAYUELA"`), minúsculas (`"rayuela"`) o espacios en los extremos (`"  rayu  "`) devuelven el mismo resultado exacto.
- [ ] Caracteres especiales o comillas (ej. `' OR '1'='1`) se buscan de manera literal sin alterar la consulta ni provocar errores en la base (inmunidad a SQL Injection probada en C-08).
- [ ] Si no hay coincidencias, se presenta un mensaje accesible informando que no hubo resultados para la búsqueda ingresada.
- [ ] Un botón "Mostrar todo el catálogo" limpia el campo y restaura el listado completo.

**Reglas de Negocio Relacionadas**: `RN-LIB-08`, `RN-UI-03`.

---

## Épica 2: Gestión de Altas con Persistencia Real (Ejercicio 2 · Casos G-02, G-03, G-04)

### US-003 — Alta atómica de nuevo libro (Caso G-02)
**Como** librero,  
**Quiero** registrar un nuevo libro asociando sus datos, editorial, género y autores,  
**Para** incorporarlo al catálogo activo y habilitarlo para la venta.

**Criterios de Aceptación**:
- [ ] El formulario `#form-libro` permite ingresar título, ISBN, precio positivo, stock inicial, editorial (select) y género opcional (select con opción vacía `"Sin clasificar"`).
- [ ] Los autores se seleccionan desde las opciones disponibles, permitiendo asignarles roles (`autor`, `coautor`, `traductor`, `ilustrador`) y orden de aparición.
- [ ] El envío genera un `POST /api/libros/` con la estructura `LibroCreate` requerida por la API.
- [ ] Tras recibir HTTP 201 Created:
  - El formulario se vacía por completo (`RN-UI-02`).
  - Se muestra un mensaje accesible con el ID y título del nuevo libro.
  - La tabla de libros cargados y el catálogo se actualizan inmediatamente con el nuevo registro.
  - El nuevo libro queda disponible de inmediato en los selectores de la sección Ventas (`RN-UI-04`).

**Reglas de Negocio Relacionadas**: `RN-LIB-01`, `RN-LIB-02`, `RN-LIB-03`, `RN-LIB-04`, `RN-LIB-05`, `RN-LIB-06`, `RN-UI-02`, `RN-UI-04`.

---

### US-004 — Manejo de rechazo por ISBN duplicado con conservación de borrador (Caso G-03)
**Como** librero,  
**Quiero** ser advertido si intento ingresar un ISBN que ya existe en la base de datos sin perder los datos que cargué,  
**Para** corregir el ISBN erróneo sin tener que volver a escribir todo el formulario.

**Criterios de Aceptación**:
- [ ] Al intentar crear un libro con un ISBN ya registrado, el backend responde con HTTP 409 Conflict (`"Ya existe un libro con ese ISBN."`).
- [ ] La interfaz web captura el código 409 y muestra el mensaje de error en el contenedor de alertas (`role="alert"`).
- [ ] **Preservación de borrador (`RN-UI-01`)**: Todos los campos (título, precio, stock, editorial, género, autorías seleccionadas) se mantienen intactos en pantalla.
- [ ] El usuario puede editar únicamente el ISBN y volver a enviar el formulario.

**Reglas de Negocio Relacionadas**: `RN-LIB-01`, `RN-UI-01`, `RN-DEP-04`.

---

### US-005 — Alta de cliente y rechazo por email duplicado (Caso G-04)
**Como** librero,  
**Quiero** registrar a un nuevo cliente con su nombre y correo electrónico,  
**Para** asociarlo a sus operaciones de compra en la librería.

**Criterios de Aceptación**:
- [ ] El formulario `#form-cliente` valida nombre no vacío y correo con formato válido.
- [ ] Ante un alta válida (`POST /api/clientes/`), el servidor responde HTTP 201, se limpia el formulario, se agrega a la tabla de clientes y se añade al selector de clientes de Ventas.
- [ ] Si se ingresa un email ya existente (incluso variando mayúsculas o espacios, ej. `ANA@example.com` vs `ana@example.com`), el backend responde HTTP 409 (`"Ya existe un cliente con ese email."`).
- [ ] Ante el 409, el frontend conserva los datos en el formulario y muestra la alerta accesible para permitir la corrección sin reingresar el nombre.

**Reglas de Negocio Relacionadas**: `RN-CLI-01`, `RN-CLI-02`, `RN-CLI-03`, `RN-UI-01`, `RN-UI-02`, `RN-UI-04`.

---

## Épica 3: Confección y Registro Transaccional de Ventas (Ejercicio 3 · Caso G-05)

### US-006 — Registro transaccional de venta multirrenglón (Caso G-05)
**Como** librero,  
**Quiero** seleccionar un cliente y agregar múltiples libros con cantidades enteras en un borrador de venta,  
**Para** concretar la operación comercial de forma transaccional y descontar el stock automáticamente.

**Criterios de Aceptación**:
- [ ] El selector de clientes y libros se puebla dinámicamente desde la API.
- [ ] El librero agrega renglones con cantidades enteras positivas (`cantidad >= 1`).
- [ ] Si se intenta agregar un libro que ya figura en el borrador, se notifica que debe editar la cantidad en su fila (`RN-VEN-02`).
- [ ] Se pueden eliminar renglones o modificar cantidades antes de confirmar.
- [ ] Al presionar "Confirmar venta", el frontend despacha `POST /api/ventas/` enviando **únicamente** `cliente_id` y lista de renglones con `libro_id` y `cantidad` (cumpliendo `extra="forbid"`, sin enviar precios ni totales).
- [ ] El servidor ejecuta una transacción ACID:
  - Adquiere bloqueo de fila con `SELECT ... FOR UPDATE` sobre los libros.
  - Verifica existencias y reduce el stock de cada libro.
  - Copia el precio actual del libro a `renglon_venta.precio_unitario`.
  - Calcula el `total` sumando los subtotales.
  - Emite el commit y responde HTTP 201 Created con el payload `VentaRead`.
- [ ] Tras el 201 Created:
  - El borrador de venta se limpia por completo (`RN-UI-02`).
  - Se muestra el mensaje de confirmación con el ID asignado a la venta y el total calculado.
  - Se agenda en segundo plano el comprobante simulado (`BackgroundTasks`).

**Reglas de Negocio Relacionadas**: `RN-VEN-01`, `RN-VEN-02`, `RN-VEN-03`, `RN-VEN-04`, `RN-VEN-05`, `RN-VEN-06`, `RN-VEN-08`, `RN-UI-02`.

---

### US-007 — Rechazo por stock insuficiente con preservación de borrador (Caso G-07)
**Como** librero,  
**Quiero** que el sistema impida una venta si no hay stock suficiente de algún ejemplar sin perder el borrador preparado,  
**Para** ajustar las cantidades con el cliente sin tener que rearmar la venta desde cero.

**Criterios de Aceptación**:
- [ ] Si la cantidad solicitada supera el stock disponible en la base, PostgreSQL rechaza la operación mediante la restricción `ck_libro_stock_no_negativo`.
- [ ] El backend captura la excepción y responde HTTP 409 con mensaje claro de stock insuficiente.
- [ ] El frontend muestra la alerta del servidor y **mantiene intacto todo el borrador** (cliente y todos los renglones cargados).
- [ ] El librero modifica la cantidad del renglón conflictivo y reintenta la confirmación con éxito.

**Reglas de Negocio Relacionadas**: `RN-LIB-03`, `RN-VEN-06`, `RN-UI-01`, `RN-DEP-04`.

---

## Épica 4: Historial y Verificación de Precios Históricos (Ejercicio 4 · Caso G-06)

### US-008 — Consulta de historial y detalle de ventas
**Como** librero o auditor,  
**Quiero** consultar la lista de ventas pasadas y ver el detalle de cualquiera de ellas,  
**Para** auditar las operaciones comerciales y verificar los renglones facturados.

**Criterios de Aceptación**:
- [ ] La sección `#historial` consulta `GET /api/ventas/` y renderiza la tabla con ID de venta, fecha/hora formateada, nombre del cliente y total.
- [ ] Al presionar "Ver detalle", se invoca `GET /api/ventas/{id}` y se despliega una tarjeta accesible con:
  - Datos de cabecera: fecha ISO, cliente (nombre y email).
  - Tabla de renglones: título del libro, cantidad, precio unitario histórico y subtotal.
  - Importe total consolidado.
- [ ] La consulta de detalle en backend se ejecuta en solo 2 sentencias SQL gracias a `joinedload` y `selectinload` con `lazy="raise"`.

**Reglas de Negocio Relacionadas**: `RN-VEN-07`, `RN-UI-05`.

---

### US-009 — Prueba pedagógica de precio histórico congelado (Caso G-06)
**Como** evaluador académico de la cátedra,  
**Quiero** modificar el precio de un libro en el catálogo mediante `PATCH /api/libros/{id}` y luego inspeccionar una venta histórica donde se incluyó ese libro,  
**Para** constatar empíricamente que el precio unitario y total de la venta histórica permanecen congelados e inmutables.

**Criterios de Aceptación**:
- [ ] Se confirma una venta con un libro a un precio determinado (ej. Rayuela a `$ 25.000,00`).
- [ ] Se modifica el precio de ese libro en el catálogo a un valor diferente (ej. `$ 35.000,00`) mediante la API o la interfaz.
- [ ] El catálogo muestra el nuevo precio de `$ 35.000,00`.
- [ ] Se abre el detalle de la venta previamente registrada en `#historial`.
- [ ] La venta histórica continúa mostrando exactamente `$ 25.000,00` como precio unitario, el subtotal original y el total inalterado.

**Reglas de Negocio Relacionadas**: `RN-LIB-09`, `RN-VEN-04`, `RN-VEN-07`.

---

## Épica 5: Infraestructura, Contenedorización y Despliegue (Ejercicio 5 · Casos G-01 a G-07)

### US-010 — Reverse Proxy y despliegue sin CORS en Easypanel
**Como** administrador o evaluador,  
**Quiero** acceder a la aplicación desde una URL pública en Easypanel sin errores de red ni CORS,  
**Para** operar el sistema de manera integrada en un entorno cloud real.

**Criterios de Aceptación**:
- [ ] El contenedor frontend corre Nginx 1.30-alpine sirviendo los archivos estáticos en el puerto 80.
- [ ] La plantilla `default.conf.template` lee la variable de entorno `API_UPSTREAM` y redirige `/api/*` hacia el backend FastAPI sin CORS.
- [ ] El backend FastAPI corre con Python 3.12, conectándose a PostgreSQL 16 mediante la variable `DATABASE_URL`.
- [ ] Al desplegar en Easypanel, las migraciones de Alembic se aplican automáticamente antes de recibir tráfico.
- [ ] Todos los flujos de catálogo, altas, ventas e historial funcionan correctamente en la URL pública.

**Reglas de Negocio Relacionadas**: `RN-DEP-01`, `RN-DEP-02`, `RN-DEP-03`.
