# Reglas de Negocio

El sistema implementa un conjunto estructurado de reglas de negocio codificadas por dominio mediante el prefijo `RN-{DOMINIO}-{NN}` para garantizar trazabilidad técnica, integridad de datos y excelencia en la experiencia de usuario.

---

## Dominio: Catálogo y Libros (RN-LIB)

- **RN-LIB-01 — Unicidad de ISBN**:
  El código ISBN de cada libro debe ser único en todo el catálogo. La garantía la asegura la base de datos mediante la restricción `uq_libro_isbn`. A nivel de validación previa (en DTO y frontend), la comparación normaliza el valor ignorando espacios, guiones y mayúsculas.
- **RN-LIB-02 — Precio positivo y moneda segura**:
  El precio de un libro debe ser un valor decimal estrictamente mayor que cero (`precio > 0.00`). Está restringido por `ck_libro_precio_positivo` en PostgreSQL y validado por Pydantic con `Field(gt=0, max_digits=10, decimal_places=2)`. En base de datos se almacena como `NUMERIC(10,2)` y en Python se manipula como `Decimal`, prohibiendo el uso de punto flotante binario (`float`) para prevenir pérdida de precisión en centavos.
- **RN-LIB-03 — Stock no negativo**:
  Las existencias de un libro no pueden ser negativas bajo ninguna circunstancia (`stock >= 0`). Esta regla está respaldada por la restricción `ck_libro_stock_no_negativo`.
- **RN-LIB-04 — Editorial obligatoria y referencialmente íntegra**:
  Todo libro debe pertenecer a una editorial existente (`editorial_id NOT NULL`). La clave foránea utiliza `ON DELETE RESTRICT`, prohibiendo la eliminación de editoriales que tengan obras asociadas.
- **RN-LIB-05 — Género opcional y representación de "Sin clasificar"**:
  El género de un libro es optativo (`genero_id NULLABLE`, `ON DELETE SET NULL`). Cuando el campo es nulo o vacío, la interfaz web debe mostrar obligatoriamente la etiqueta `"Sin clasificar"`.
- **RN-LIB-06 — Composición de autorías y roles válidos**:
  Todo libro debe contar con al menos una autoría (`autores: list[AutoriaCreate] = Field(min_length=1)`).
  - Los únicos roles permitidos son: `'autor'`, `'coautor'`, `'traductor'`, `'ilustrador'` (controlados por el tipo literal en Python y `ck_libro_autor_rol_valido` en la base).
  - Cada autoría debe tener un orden de aparición estrictamente positivo (`orden >= 1`, `ck_libro_autor_orden_positivo`).
  - Un mismo autor no puede figurar dos veces en el mismo libro.
  - Dos autores no pueden compartir el mismo número de orden en la portada.
- **RN-LIB-07 — Paginación estándar de colecciones**:
  Todos los listados de catálogo y entidades admiten paginación basada en `limit` (entero entre 1 y 100, por defecto 20) y `offset` (entero mayor o igual a 0). Peticiones con valores fuera de rango son rechazadas con HTTP 422.
- **RN-LIB-08 — Búsqueda por título insensible a mayúsculas y segura**:
  El endpoint `GET /libros/` admite el parámetro `titulo`. La búsqueda se efectúa mediante coincidencias parciales con `ILIKE %titulo%`, ignorando mayúsculas, minúsculas y espacios extremos (`trim()`). El valor viaja como parámetro ligado seguro en SQLAlchemy, inmune a inyecciones SQL (demostrado en el caso C-08).
- **RN-LIB-09 — Modificación parcial (PATCH) no retroactiva**:
  Se permite actualizar precio, stock, título, editorial o género mediante `PATCH /libros/{id}`. Si se envía `genero_id: null`, se desvincula el género. La actualización del precio en un libro solo afecta a ventas futuras; las ventas pasadas permanecen inmutables.

---

## Dominio: Clientes (RN-CLI)

- **RN-CLI-01 — Unicidad y normalización de correo electrónico**:
  El correo electrónico de cada cliente debe ser único (`uq_cliente_email`). Para evitar duplicados artificiales, el sistema normaliza el email a minúsculas y sin espacios en los extremos antes de la persistencia o comparación.
- **RN-CLI-02 — Formato de email válido**:
  El correo debe cumplir con el formato estándar `usuario@dominio.extension`. Formatos inválidos son rechazados con HTTP 422.
- **RN-CLI-03 — Nombre completo obligatorio**:
  El nombre del cliente no puede estar vacío ni compuesto únicamente de espacios en blanco (`min_length=1`, `max_length=200`).
- **RN-CLI-04 — Perfil de cliente único (Relación 1 a 1)**:
  Un cliente puede tener como máximo un perfil de contacto adicional (`telefono`, `direccion`). El intento de registrar un segundo perfil mediante `POST /clientes/{id}/perfil` es rechazado con HTTP 409 (`El cliente ya tiene un perfil.`) gracias al índice `UNIQUE` en `perfil_cliente.cliente_id`.
- **RN-CLI-05 — Integridad histórica del cliente**:
  No se permite eliminar un cliente que posea ventas registradas en el sistema (`ON DELETE RESTRICT` en `venta.cliente_id`).

---

## Dominio: Ventas (RN-VEN)

- **RN-VEN-01 — Existencia previa del cliente**:
  La venta debe asociar un `cliente_id` existente. Si el cliente no existe en la base, la operación es rechazada con HTTP 409 (`"El cliente indicado no existe."`).
- **RN-VEN-02 — Composición de renglones y unicidad de libros**:
  Toda venta debe contener al menos un renglón. Un libro no puede repetirse en más de un renglón de la misma venta (`UniqueConstraint("venta_id", "libro_id")`). Si se desean más unidades, debe ajustarse el campo `cantidad` en el renglón correspondiente.
- **RN-VEN-03 — Inmutabilidad de entrada de precios (Prohibición de campos extra)**:
  El esquema `VentaCreate` y `RenglonCreate` prohíben estrictamente el envío de precios unitarios, subtotales o totales desde el cliente web (`model_config = ConfigDict(extra="forbid")`). Si el payload contiene campos como `precio_unitario` o `total`, la API rechaza la petición con HTTP 422.
- **RN-VEN-04 — Snapshot de precio histórico congelado**:
  El servidor backend lee el libro directamente desde la base utilizando bloqueo pesimista (`SELECT ... FOR UPDATE`), obtiene su precio actual y lo copia en `renglon_venta.precio_unitario`. Este valor queda **congelado para siempre** en la tabla de renglones. Cualquier modificación posterior del precio del libro en el catálogo no alterará jamás el precio registrado en la venta.
- **RN-VEN-05 — Cálculo estricto del total en el servidor**:
  El importe total de la venta es calculado exclusivamente en el backend sumando `cantidad * precio_unitario` de todos los renglones, garantizando precisión decimal absoluta.
- **RN-VEN-06 — Control atómico y descuento de stock**:
  Al confirmar la venta, el stock del libro se reduce en la cantidad solicitada dentro de la misma transacción. Si el stock resultante fuera menor a cero, la restricción `ck_libro_stock_no_negativo` aborta la transacción y el backend responde con HTTP 409 indicando stock insuficiente.
- **RN-VEN-07 — Inmutabilidad de ventas confirmadas**:
  Una venta registrada es un hecho histórico contable inalterable. La API **no expone métodos PATCH ni DELETE** para el recurso `/ventas/`. Las ventas solo pueden consultarse (`GET`).
- **RN-VEN-08 — Notificación asincrónica de comprobante**:
  Tras confirmar la venta y realizar el commit en la base de datos, el servidor despacha un aviso de comprobante como tarea en segundo plano (`fastapi.BackgroundTasks`), registrando en el log el envío con un retardo simulado de ~0.5 segundos sin demorar la respuesta HTTP 201 al usuario.

---

## Dominio: Experiencia de Usuario y Frontend (RN-UI)

- **RN-UI-01 — Preservación de borrador ante rechazo (409 / 422)**:
  Si el servidor rechaza una solicitud con error de conflicto (409) o validación (422), el formulario (ya sea de alta de libro, cliente o borrador de venta) **debe conservar intactos todos los datos ingresados en memoria**. El usuario no debe perder su trabajo y podrá corregir el campo causante del error.
- **RN-UI-02 — Limpieza y confirmación tras éxito (201 Created)**:
  Únicamente cuando el servidor responde con HTTP 201 Created, el formulario correspondiente se vacía por completo, se muestra un mensaje accesible de éxito (`role="status"`) y se actualizan las vistas dependientes.
- **RN-UI-03 — Prevención de navegación nativa**:
  Todos los envíos de formularios interceptan el evento de envío con `event.preventDefault()`, evitando recargas de página completas (`Page Reload`) y garantizando una experiencia de usuario fluida e instantánea.
- **RN-UI-04 — Sincronización en caliente de selectores de venta**:
  Tras concretar el alta exitosa de un libro o cliente, las opciones de los selectores en la pantalla de Ventas se actualizan inmediatamente sin requerir recargar la página y sin alterar ningún borrador de venta en curso.
- **RN-UI-05 — Accesibilidad y gestión de errores visuales**:
  Los contenedores de errores deben usar el atributo `role="alert"` y foco programático, y los campos con fallos de validación deben marcarse con `aria-invalid="true"` para soporte completo de tecnologías de asistencia.

---

## Dominio: Red, Integración y Reverse Proxy (RN-DEP)

- **RN-DEP-01 — Prefijo unificado `/api/` con barra final**:
  Todas las peticiones del frontend dirigidas al backend deben utilizar la ruta relativa `/api/` y respetar la **barra final obligatoria** en colecciones (ejemplo: `fetch('/api/libros/')`, `fetch('/api/ventas/')`). Omitir la barra final genera redirecciones HTTP 307 no deseadas emitidas por FastAPI.
- **RN-DEP-02 — Reescritura transparente de URL en Nginx**:
  Nginx rutea las peticiones que ingresan por `/api/` hacia el servicio interno `http://${API_UPSTREAM}/;`. La barra final en la directiva `proxy_pass` remueve automáticamente el prefijo `/api/`, permitiendo que FastAPI reciba rutas puras como `/libros/` o `/ventas/`.
- **RN-DEP-03 — Prohibición de CORS**:
  Al convivir frontend y API bajo el mismo origen provisto por Nginx, queda prohibido habilitar middlewares de CORS en FastAPI, garantizando una superficie de ataque mínima.
- **RN-DEP-04 — Traducción de excepciones sin fuga de información (RN-12)**:
  Ninguna respuesta de error (400, 404, 409, 500) puede exponer texto interno de PostgreSQL (nombres de tablas, restricciones, claves primarias, sentencias SQL) ni trazas de código (*tracebacks*). Todos los errores deben ser traducidos a mensajes en español orientados al negocio. Los detalles técnicos sólo se dirigen al log interno del servidor.
