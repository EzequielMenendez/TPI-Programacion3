# Decisiones y Supuestos

## Decisiones documentadas

### DD-01 — Estrategia para la Carga de Selectores en Formularios (Ejercicio 2 y 3)

- **Decisión**: Se opta por utilizar los endpoints de listado (`GET /api/autores/`, `GET /api/clientes/`, `GET /api/editoriales/`, `GET /api/generos/`) para poblar de forma directa y reactiva los elementos `<select>` y casillas de verificación en los formularios de alta y venta. A su vez, se conservan los endpoints de consulta individual por ID (`GET /api/autores/{id}`, `GET /api/clientes/{id}`) para verificación puntual de integridad referencial.
- **Contexto**: La consigna de la Evaluación Global establece:  
  > *"Si tu API también tiene listados o buscadores, podés usarlos para los selectores. Documentá qué opción elegiste."*  
  El backend de Programación III ya exponía ambas capacidades en sus módulos.
- **Alternativas consideradas**:
  1. *Consulta uno a uno por ID*: Requeriría que el usuario escriba a mano el ID numérico del cliente o autor y presione un botón "Verificar", emitiendo un `GET /{id}` previo.
  2. *Listado paginado completo en el inicio*: Cargar las listas al iniciar la interfaz o al enfocar la sección.
- **Justificación**: Poblar los selectores mediante los listados brinda una experiencia de usuario moderna, intuitiva y fluida, evitando que el operador tenga que recordar o adivinar identificadores numéricos. A nivel técnico, el catálogo inicial posee dimensiones controladas (3 editoriales, 3 géneros, 5 autores, 2 clientes), por lo que una única petición de listado al iniciar es extraordinariamente eficiente.
- **Trade-offs aceptados**: En catálogos con millones de registros se requeriría autocompletado con paginación asincrónica en demanda; para el alcance del TPI, el listado directo con límite holgado es la solución óptima y más limpia.

---

### DD-02 — Configuración del Reverse Proxy Nginx con Barra Final en `proxy_pass`

- **Decisión**: Configurar la directiva de reenvío en Nginx como `proxy_pass http://${API_UPSTREAM}/;` (con barra final obligatoria después de la variable).
- **Contexto**: El frontend emite peticiones a `/api/libros/`, `/api/ventas/`, etc., pero FastAPI define sus rutas a nivel raíz (`@router.get("/")` montado en `prefix="/libros"`).
- **Alternativas consideradas**:
  1. *Montar la API con un prefijo `/api` global*: Modificar `main.py` de FastAPI para agregar `root_path="/api"` o incluir `/api` en cada router.
  2. *Reescritura de ruta (`rewrite`) manual con regex en Nginx*: Usar directivas `rewrite ^/api/(.*)$ /$1 break;`.
  3. *Barra final en `proxy_pass`*: Comportamiento nativo de Nginx para sustitución de prefijo.
- **Justificación**: Al colocar la barra final en el target de `proxy_pass`, Nginx reemplaza el bloque coincidente (`location /api/`) por la URI del proxy pass (`/`), transmitiendo la petición como `/libros/` al backend. Esto mantiene el código de FastAPI 100% puro y canónico, desacoplado de la infraestructura de despliegue.
- **Trade-offs aceptados**: Requiere que el frontend respete siempre la barra final en las rutas de colección (ej. `/api/libros/` y no `/api/libros`) para evitar que FastAPI devuelva redirecciones `307 Temporary Redirect`.

---

### DD-03 — Inmutabilidad de Entrada de Precios en Ventas y Validación `extra="forbid"`

- **Decisión**: Prohibir categóricamente que el cliente envíe `precio_unitario`, `subtotal` o `total` en `POST /ventas/`, delegando el cálculo de importes y la fijación del precio histórico exclusivamente al backend. Configurar Pydantic con `model_config = ConfigDict(extra="forbid")`.
- **Contexto**: En sistemas de facturación o venta, confiar en precios enviados por el cliente web es una falla crítica de seguridad y de negocio.
- **Alternativas consideradas**:
  1. *Permitir envío y recalcular en servidor sin fallar*: Ignorar los campos enviados por el cliente.
  2. *Aceptar precios enviados por el frontend como válidos*: Inseguro.
  3. *Rechazar con HTTP 422 si se envían datos no permitidos (`extra="forbid"`)*: Enfoque estricto.
- **Justificación**: Al rechazar con 422 peticiones con campos extra, se detectan errores de integración de inmediato y se garantiza que ningún cliente malicioso o desactualizado intente manipular precios o totales. El backend utiliza `SELECT ... FOR UPDATE` para leer el precio oficial vigente de la base de datos al momento de la venta y congelarlo en `renglon_venta`.
- **Trade-offs aceptados**: El frontend debe tener cuidado de no incluir propiedades calculadas en el JSON que despacha al endpoint `POST /ventas/`.

---

### DD-04 — Verificación Delegada a la Base de Datos y Traducción en Capa de Servicio

- **Decisión**: No realizar consultas previas de verificación (`SELECT COUNT(*)...`) para comprobar si un ISBN o email ya existen antes de un alta. Intentar la inserción directa y capturar `IntegrityError`, traduciéndolo en la capa de servicio a mensajes de dominio limpios (`NoEncontrado` 404 / `Conflicto` 409).
- **Contexto**: Las consultas de chequeo previo generan condiciones de carrera (*race conditions*) bajo concurrencia y duplican innecesariamente el tráfico a la base de datos.
- **Alternativas consideradas**:
  1. *Consultar existencia antes de insertar*: Emite 2 consultas SQL por alta y no garantiza unicidad ante accesos simultáneos.
  2. *Dejar que la base falle y retornar el error crudo*: Expone nombres de tablas y restricciones internas de PostgreSQL (inseguro y poco amigable).
  3. *Delegar en la base y traducir en el service*: La base garantiza atomicidad; el service traduce el error a español para el usuario.
- **Justificación**: La convención de nombres en `app/core/database.py` asigna nombres unívocos a todas las restricciones (`uq_libro_isbn`, `ck_libro_stock_no_negativo`, etc.). El servicio conoce el mapa de restricciones y emite un mensaje amigable al cliente sin revelar detalles internos de PostgreSQL (`RN-DEP-04` / `RN-12`).
- **Trade-offs aceptados**: Requiere que cada módulo mantenga su propio mapa de traducción de restricciones.

---

### DD-05 — Preservación de Borradores en Frontend ante Fallos (409 y 422)

- **Decisión**: Cuando la API responde con un error de cliente (409 Conflict o 422 Unprocessable Entity), el frontend no debe resetear los formularios ni borrar el borrador de venta en memoria.
- **Contexto**: Si un librero carga un libro con 3 autores y falla por un dígito en el ISBN, resetear el formulario genera frustración y pérdida de tiempo.
- **Alternativas consideradas**:
  1. *Resetear formulario ante cualquier error*: Mala experiencia de usuario.
  2. *Conservar los datos y marcar los campos con error*: Enfoque estándar de usabilidad moderna.
- **Justificación**: El formulario solo se vacía cuando la respuesta es exitosa (`201 Created`). Ante errores, se conservan los valores y se muestra la alerta para que el usuario simplemente ajuste el campo incorrecto.
- **Trade-offs aceptados**: Se requiere código explícito en el frontend para evitar llamadas accidentales a `form.reset()` en los bloques `catch` o flujos de error.

---

## Supuestos inferidos

### SU-01 — Entorno de Terminal Única / Modo Operador Monorrol
- **Supuesto**: El sistema opera como un sistema de punto de venta físico o terminal de mostrador académico, donde no se requiere autenticación individual por operador ni control de acceso por perfiles de usuario.
- **Origen**: Requerimientos del TPI Programación III y consigna de la Evaluación Global (no se solicita módulo de usuarios/contraseñas ni JWT).
- **Riesgo si es falso**: Requeriría incorporar tablas de usuarios, hash de contraseñas con bcrypt, middlewares de seguridad y pantallas de login.
- **Cómo validar**: Confirmado en la definición de alcance con el docente y el usuario.

### SU-02 — Naturaleza Pedagógica de los Datos Ficticios
- **Supuesto**: Todos los datos cargados por el script `seed.py` (Rayuela, Ficciones, Borges, Cortázar, Ana Pérez, etc.) y las altas manuales son ficticios y orientados a la comprobación de los casos de prueba de cátedra.
- **Origen**: Consigna académica y pie de página de la interfaz web.
- **Riesgo si es falso**: Nulo; el sistema está diseñado para cumplir la currícula académica.

### SU-03 — Persistencia de Base de Datos en Easypanel mediante Volúmenes Nombrados
- **Supuesto**: En el despliegue en Easypanel, el contenedor PostgreSQL 16 debe tener mapeado un volumen persistente para que los datos sobrevivan a reinicios o nuevos despliegues del contenedor backend/frontend.
- **Origen**: Principios de administración de infraestructura contenerizada.
- **Riesgo si es falso**: Cada recreación del contenedor PostgreSQL vaciaría las tablas, requiriendo re-ejecutar `seed.py`.
- **Cómo validar**: Verificar la configuración del servicio `db` en Easypanel asegurando un montaje tipo `Volume` hacia `/var/lib/postgresql/data`.

### SU-04 — Resolución DNS Interna en la Red de Easypanel
- **Supuesto**: Los contenedores desplegados en el mismo proyecto de Easypanel comparten una red Docker interna tipo bridge, permitiendo que el frontend resuelva el nombre del servicio backend (ej. `API_UPSTREAM=backend:8000`) sin necesidad de IPs fijas ni salida a internet.
- **Origen**: Funcionamiento estándar de redes en Docker y Easypanel.
- **Riesgo si es falso**: Nginx no podría comunicarse con FastAPI internamente.
- **Cómo validar**: Probar conectividad interna en el despliegue de Easypanel.
