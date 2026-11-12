# Descripción General

## Stack tecnológico

| Capa | Tecnologías | Versión mínima / Variante | Rol en la solución |
|---|---|---|---|
| **Frontend Web** | HTML5 semántico, CSS3 nativo, JavaScript nativo (ES6+) | Navegadores modernos (Chromium 120+, Firefox 120+, Safari 17+) | SPA ligera sin dependencias externas. Consume `/api/` mediante `fetch` asincrónico, renderiza dinámicamente y manipula el DOM con `textContent` y validaciones accesibles. |
| **Reverse Proxy / Servidor Web** | Nginx | 1.30-alpine | Punto de entrada público. Sirve archivos estáticos (`index.html`, `css/`, `js/`) y rutea `/api/` hacia el contenedor backend upstream sin CORS. |
| **Backend REST API** | Python, FastAPI, Uvicorn, SQLModel / Pydantic v2 | Python 3.12, FastAPI 0.115+ | API RESTful asincrónica. Define modelos, esquemas DTO con validación estricta, servicios de negocio, manejo de transacciones y tareas en segundo plano. |
| **ORM / Acceso a Datos** | SQLAlchemy 2.0 (modo asincrónico), Alembic, asyncpg | SQLAlchemy 2.0+, Alembic 1.13+, asyncpg 0.29+ | Mapeo objeto-relacional asincrónico, pool de conexiones, carga declarativa de relaciones (`joinedload`, `selectinload`), control de consultas N+1 con `lazy="raise"` y migraciones de esquema. |
| **Base de Datos** | PostgreSQL | 16.x-alpine | Base de datos relacional transaccional (ACID). Garantiza restricciones de unicidad, chequeos numéricos y claves foráneas con índices dedicados. |
| **Contenedores y Despliegue** | Docker, Docker Compose, Easypanel | Docker 24+, Compose v2 | Contenedorización multi-etapa, orquestación local y despliegue continuo en la plataforma PaaS Easypanel sobre VPS Linux. |

## Arquitectura general

La solución adopta una arquitectura de tres capas distribuida en contenedores Docker independientes que operan en una red interna privada, expuestos hacia el exterior exclusivamente a través de Nginx en el puerto 80 (o 443 en Easypanel).

```
                      INTERNET / NAVEGADOR DEL USUARIO
                                     │
                                     │ HTTP :80 / HTTPS :443
                                     ▼
                    ┌─────────────────────────────────┐
                    │       NGINX (Reverse Proxy)     │
                    │         Contenedor Frontend     │
                    │     (nginx:1.30-alpine)         │
                    └────────┬───────────────┬────────┘
                             │               │
            Rutas Estáticas  │               │ Peticiones API
           /index.html, /js, │               │ /api/*
           /css              │               ▼ (reescritura sin /api/)
                             ▼     ┌───────────────────────────────────┐
                    ┌─────────────┐│        FASTAPI (Backend API)      │
                    │   Archivos  ││         Contenedor Backend        │
                    │   Estáticos ││         (Python 3.12-slim)        │
                    │  en Nginx   ││    Puerto interno :8000           │
                    └─────────────┘└─────────┬─────────────────────────┘
                                             │
                                             │ asyncpg (SQLAlchemy 2.0 Async)
                                             │ Puerto interno :5432
                                             ▼
                                   ┌───────────────────────────────────┐
                                   │       POSTGRESQL 16 (Base Datos)  │
                                   │           Contenedor DB           │
                                   │      Volumen persistente          │
                                   └───────────────────────────────────┘
```

### Justificación de las decisiones arquitectónicas

1. **Unificación de origen mediante Nginx (Eliminación de CORS)**:
   Al servir el frontend y rutear las peticiones a la API bajo el mismo dominio y puerto (las llamadas van a `/api/...`), el navegador no detecta un origen cruzado (`Cross-Origin`). Esto elimina por completo la complejidad de cabeceras CORS (`Access-Control-Allow-Origin`), peticiones previas de sondeo `OPTIONS` (preflight) y potenciales vulnerabilidades asociadas.
2. **Reescritura de URL en el Reverse Proxy**:
   Nginx utiliza la directiva `proxy_pass http://${API_UPSTREAM}/;` (notar la barra final). Esto remueve automáticamente el prefijo `/api/` antes de que la petición ingrese a FastAPI, permitiendo que la API mantenga sus rutas limpias y canónicas (`/libros/`, `/clientes/`, `/ventas/`) sin necesidad de configurar un `root_path` forzado en el código Python.
3. **Persistencia relacional y atomicidad estricta**:
   El pasaje de `localStorage` a PostgreSQL 16 garantiza consistencia transaccional (ACID). Las operaciones de alta de libro (que involucran la tabla `libro` y la tabla de asociación `libro_autor`) y de registro de venta (que involucra `venta`, `renglon_venta` y actualización de `stock` en `libro`) ocurren dentro de una única transacción atómica.
4. **Prevención de N+1 por contrato**:
   Todas las relaciones de modelos SQLModel/SQLAlchemy se configuran con `lazy="raise"`. Esto impide que SQLAlchemy emita consultas adicionales no deseadas de forma implícita; cualquier relación consultada debe ser cargada explícitamente mediante `joinedload` o `selectinload`.

## Integraciones externas

| Servicio | Propósito | Tipo de integración |
|---|---|---|
| **Easypanel PaaS** | Plataforma de orquestación en la nube para hospedar los tres contenedores (PostgreSQL, Backend y Frontend), gestionar SSL y configurar variables de entorno. | Plataforma de hosting y despliegue (Docker/Swarm subyacente). |
| **Servicio de Notificación de Comprobante** | Simulación pedagógica de envío asincrónico de comprobante de venta por correo electrónico al cliente tras confirmar la venta. | Tarea en segundo plano interna (`fastapi.BackgroundTasks`) con `asyncio.sleep(0.5)` y registro en logger. |

## API REST

La API se organiza por módulos funcionales. Las rutas de colección respetan de forma estricta la **barra final** (`/`):

### Módulo Health (Monitoreo)
- `GET /health/live`: Comprueba que el proceso de FastAPI se encuentra en ejecución. Códigos: `200`.
- `GET /health/ready`: Comprueba que la API tiene conectividad activa y operativa con la base de datos PostgreSQL. Códigos: `200`, `503`.

### Módulo Editoriales
- `POST /editoriales/`: Crea una nueva editorial. Códigos: `201`, `409`, `422`.
- `GET /editoriales/`: Lista editoriales paginadas (`limit`, `offset`). Códigos: `200`, `422`.
- `GET /editoriales/{id}`: Obtiene una editorial por su identificador. Códigos: `200`, `404`, `422`.
- `PATCH /editoriales/{id}`: Modifica parcialmente una editorial. Códigos: `200`, `404`, `409`, `422`.
- `GET /editoriales/{id}/libros`: Obtiene los libros publicados por una editorial. Códigos: `200`, `404`.

### Módulo Géneros
- `POST /generos/`: Crea un nuevo género. Códigos: `201`, `409`, `422`.
- `GET /generos/`: Lista todos los géneros cargados. Códigos: `200`.
- `GET /generos/{id}/libros`: Lista los libros pertenecientes a un género específico. Códigos: `200`, `404`.

### Módulo Autores
- `POST /autores/`: Registra un autor (nombre, nacionalidad). Códigos: `201`, `422`.
- `GET /autores/`: Lista autores paginados (`limit`, `offset`). Códigos: `200`, `422`.
- `GET /autores/{id}`: Obtiene el detalle de un autor por ID. Códigos: `200`, `404`, `422`.
- `PATCH /autores/{id}`: Modifica parcialmente un autor. Códigos: `200`, `404`, `422`.
- `GET /autores/{id}/libros`: Lista los libros donde participa el autor. Códigos: `200`, `404`.

### Módulo Libros
- `POST /libros/`: Da de alta un libro junto con sus autorías y roles en una transacción atómica. Códigos: `201`, `409`, `422`.
- `GET /libros/`: Lista libros con paginación (`limit`, `offset`) y filtros opcionales (`titulo` para coincidencia parcial insensible a mayúsculas/minúsculas vía `ILIKE`, `genero_id`). Códigos: `200`, `422`.
- `GET /libros/{id}`: Detalle completo de un libro incluyendo editorial, género y lista ordenada de autores con sus roles. Códigos: `200`, `404`, `422`.
- `PATCH /libros/{id}`: Actualización parcial de campos de un libro (precio, stock, título, editorial, género). Códigos: `200`, `404`, `409`, `422`.

### Módulo Clientes
- `POST /clientes/`: Crea un cliente con nombre y email único (normalizado a minúsculas). Códigos: `201`, `409`, `422`.
- `GET /clientes/`: Lista clientes paginados. Códigos: `200`.
- `GET /clientes/{id}`: Obtiene los datos del cliente y su perfil asociado (si existe). Códigos: `200`, `404`, `422`.
- `PATCH /clientes/{id}`: Modificación de nombre o email. Códigos: `200`, `404`, `409`, `422`.
- `POST /clientes/{id}/perfil`: Asigna el perfil opcional (teléfono, dirección) a un cliente que aún no lo tenga. Códigos: `201`, `404`, `409`, `422`.
- `GET /clientes/{id}/ventas`: Lista las ventas históricas asociadas a un cliente. Códigos: `200`, `404`.

### Módulo Ventas
- `POST /ventas/`: Registra una venta multirrenglón. Recibe `cliente_id` y lista de `renglones` (`libro_id`, `cantidad`). Códigos: `201`, `409`, `422`. Prohíbe campos extra como precio o total (`extra="forbid"`).
- `GET /ventas/`: Lista ventas históricas paginadas (`id`, `fecha`, `total`, `cliente`). Códigos: `200`, `422`.
- `GET /ventas/{id}`: Detalle completo de una venta con cliente y renglones (`libro_id`, `titulo`, `cantidad`, `precio_unitario` histórico, `subtotal`). Códigos: `200`, `404`.
