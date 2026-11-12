# Actores y Roles

## Actores del sistema

El sistema opera bajo un modelo de **usuario único / terminal de mostrador** orientado a entornos de librería y evaluación académica. No cuenta con autenticación por credenciales individuales, pero define claramente los actores humanos y automatizados que interactúan con las distintas capas de la aplicación.

| Actor | Descripción | Cómo interactúa |
|---|---|---|
| **Operador de Librería (Librero)** | Usuario final operativo que atiende el mostrador, consulta existencias, gestiona altas y concreta ventas. | Interactúa exclusivamente mediante la interfaz web gráfica (`index.html`), navegando entre las secciones `#catalogo`, `#libros`, `#clientes`, `#ventas` e `#historial`. |
| **Administrador / DevOps** | Responsable técnico de la infraestructura, aprovisionamiento de contenedores, persistencia y monitoreo. | Gestiona los contenedores en Easypanel, inspecciona logs de Nginx/FastAPI/Postgres, ejecuta migraciones y scripts de inicialización (`seed.py`). |
| **Evaluador Académico (Docente)** | Docente o ayudante de cátedra que audita el cumplimiento de las consignas técnicas y pedagógicas de la Evaluación Global. | Realiza pruebas funcionales directas en la interfaz web, ejecuta peticiones HTTP mediante clientes de API (`casos_minimos.http`), verifica la ausencia de CORS y valida los casos G-01 a G-07. |
| **Cliente Automatizado (Test Client)** | Scripts automatizados o herramientas HTTP (VS Code REST Client, PyCharm HTTP Client, curl) que ejecutan pruebas de contrato. | Envían peticiones HTTP directas a los endpoints `/api/*` o `/health/*` sin pasar por la interfaz gráfica de usuario. |

## RBAC — Matriz de permisos

Dado el alcance monorrol del sistema en esta versión, la matriz de permisos refleja las **capacidades operativas habilitadas y las restricciones arquitectónicas del dominio**:

| Rol / Actor | Recurso | Crear (POST) | Leer (GET) | Actualizar (PATCH) | Eliminar (DELETE) | Reglas y Restricciones |
|---|---|:---:|:---:|:---:|:---:|---|
| **Operador / Evaluador** | **Libros** (`/libros/`) | ✅ (201) | ✅ (200) | ✅ (200) | ❌ (Prohibido) | Alta con autorías atómicas. Listado con filtros y detalle. Actualización parcial de precio y stock. No se expone DELETE para evitar orfandad en ventas. |
| **Operador / Evaluador** | **Clientes** (`/clientes/`) | ✅ (201) | ✅ (200) | ✅ (200) | ❌ (Prohibido) | Alta con email único normalizado. Perfil 1 a 1 opcional (`/clientes/{id}/perfil`). Actualización de datos de contacto. No se permite eliminar clientes con ventas. |
| **Operador / Evaluador** | **Ventas** (`/ventas/`) | ✅ (201) | ✅ (200) | ❌ (Prohibido) | ❌ (Prohibido) | Alta con bloqueo pesimista y cálculo de servidor. Prohibido PATCH y DELETE (`RN-VEN-07` / `RN-08`): las ventas son registros históricos inmutables. |
| **Operador / Evaluador** | **Editoriales** (`/editoriales/`) | ✅ (201) | ✅ (200) | ✅ (200) | ❌ (Restringido) | Listado y consulta individual. La base rechaza borrado si existen libros asociados (`ON DELETE RESTRICT`). |
| **Operador / Evaluador** | **Géneros** (`/generos/`) | ✅ (201) | ✅ (200) | ❌ (N/A) | ❌ (Restringido) | Listado y consulta de libros por género. `genero_id` es nullable en libros; su borrado provocaría `SET NULL`. |
| **Operador / Evaluador** | **Autores** (`/autores/`) | ✅ (201) | ✅ (200) | ✅ (200) | ❌ (Restringido) | Alta de autor. Listado y detalle. El borrado está restringido si el autor está vinculado a algún libro. |
| **DevOps / Evaluador** | **Salud** (`/health/`) | ❌ (N/A) | ✅ (200/503) | ❌ (N/A) | ❌ (N/A) | Endpoints de diagnóstico operativo: `/live` y `/ready` (con chequeo activo de base de datos). |

## Rutas públicas

En esta versión académica, **todas las rutas son públicas** a nivel de red (accesibles sin encabezados de autorización `Bearer` ni cookies de sesión), protegidas únicamente por el aislamiento de la red interna de Easypanel y el enrutamiento controlado de Nginx:

### Rutas Frontend
- `/` o `/index.html`: Carga la interfaz gráfica de usuario completa.
- `/css/*`: Archivos de estilo en cascada (`styles.css`).
- `/js/*`: Scripts nativos del cliente (`api.js`, `catalogo.js`, `libros.js`, `clientes.js`, `ventas.js`, etc.).

### Rutas API (expuestas mediante Nginx en `/api/*`)
- `/api/health/live`: Diagnóstico de disponibilidad de proceso.
- `/api/health/ready`: Diagnóstico de conectividad con PostgreSQL.
- `/api/editoriales/`: Colección de editoriales.
- `/api/generos/`: Colección de géneros literarios.
- `/api/autores/`: Colección de autores y roles.
- `/api/libros/`: Colección de libros y detalle individual.
- `/api/clientes/`: Colección de clientes y perfiles asociados.
- `/api/ventas/`: Colección y detalle de transacciones de venta.
