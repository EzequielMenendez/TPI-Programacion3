# Arquitectura Propuesta

## Patrones aplicados

| Patrón | Dónde se usa | Por qué se eligió |
|---|---|---|
| **Reverse Proxy / Unified Gateway** | Contenedor Nginx en el frontend | Centraliza el punto de entrada HTTP en el puerto 80, sirviendo archivos estáticos y ruteando `/api/*` al backend upstream. Elimina problemas y configuraciones de CORS al unificar el origen. |
| **Monolito Modular por Dominios** | `backend/app/modules/` | Estructura el backend en paquetes independientes (`health`, `editoriales`, `generos`, `autores`, `libros`, `clientes`, `ventas`), cada uno con sus propios `models.py`, `schemas.py`, `service.py` y `router.py`, garantizando alta cohesión y bajo acoplamiento. |
| **Data Transfer Object (DTO)** | `schemas.py` en cada módulo (SQLModel / Pydantic v2) | Desacopla los modelos de persistencia relacional de las cargas útiles enviadas y recibidas por la API HTTP. Permite contratos estrictos como `VentaCreate(extra="forbid")` para impedir alteraciones maliciosas. |
| **Data Snapshot / Congelamiento Histórico** | Entidad `RenglonVenta` y tabla `renglon_venta` | Resuelve la necesidad de inmutabilidad contable copiando el precio unitario del libro en el momento de la confirmación de la venta, volviéndolo inmune a futuros cambios de precios en el catálogo. |
| **Control Estricto de Carga (Anti N+1)** | Configuración de relaciones con `lazy="raise"` en SQLAlchemy | Garantiza que ninguna relación de base de datos se cargue de forma implícita o diferida en tiempo de ejecución. Fuerza a que cada lectura declare explícitamente sus asociaciones mediante `joinedload` (relaciones a uno) o `selectinload` (colecciones). |
| **Traducción Centralizada de Excepciones** | `app/core/errores.py` y handlers en `main.py` | La base de datos es la dueña de la integridad mediante restricciones nombradas; los servicios capturan `IntegrityError` y lo transforman en errores de dominio amigables (`Conflicto` 409, `NoEncontrado` 404), protegiendo la estructura interna de la base. |
| **Background Worker In-Process** | `fastapi.BackgroundTasks` en `POST /ventas/` | Ejecuta tareas asincrónicas no críticas (simulación de envío de comprobante por correo) después de enviar la respuesta HTTP al cliente, sin demorar la transacción principal. |

---

## Estructura de directorios

```
TPI-Programacion3/
├── .active-orchestrator-state.json   # Estado orquestador del ciclo de vida SDD
├── docker-compose.yml                 # Orquestación para pruebas locales completas
├── env.example                        # Plantilla de variables de entorno (no sensible)
├── requirements.txt                   # Dependencias raíz (opcional de soporte)
├── DEPLOY.md                          # Guía operativa y pasos de despliegue en Easypanel
├── evidencia/                         # Evidencias de ejecución de casos C-01..C-08 y G-01..G-07
│   ├── C-07_consultas.txt             # Salida de sentencias SQL sin consultas N+1
│   └── G-01_a_G-07_capturas/          # Capturas de pantalla del despliegue en Easypanel
│
├── frontend/                          # Contenedor de Interfaz de Usuario y Reverse Proxy
│   ├── Dockerfile                     # Imagen Nginx multi-stage o directa alpine
│   ├── default.conf.template          # Plantilla Nginx con variable ${API_UPSTREAM}
│   ├── index.html                     # SPA semántica (Catálogo, Libros, Clientes, Ventas, Historial)
│   ├── css/
│   │   └── styles.css                 # Estilos nativos responsivos (320px a 1280px)
│   └── js/
│       ├── api.js                     # Cliente HTTP fetch centralizado para `/api/`
│       ├── datos.js                   # Datos semilla y validaciones de arranque
│       ├── utilidades.js              # Helpers de formateo de moneda y manipulación segura del DOM
│       ├── navegacion.js              # Manejo de hash routing y aria-current
│       ├── catalogo.js                # Renderizado de tarjetas y búsqueda por título
│       ├── libros.js                  # Formulario de alta de libros y tabla
│       ├── clientes.js                # Formulario de alta de clientes y tabla
│       ├── ventas-modelo.js           # Lógica de cálculo en centavos seguros y borrador
│       └── ventas.js                  # Interfaz de confirmación de ventas y consulta de historial
│
├── backend/                           # Contenedor de la API RESTful (FastAPI)
│   ├── Dockerfile                     # Imagen Python 3.12-slim con Alembic y Uvicorn
│   ├── requirements.txt               # Dependencias fijadas (fastapi, uvicorn, sqlmodel, asyncpg)
│   ├── alembic.ini                    # Configuración de migraciones (toma DATABASE_URL del env)
│   ├── app/
│   │   ├── main.py                    # Aplicación FastAPI, lifespan, manejadores de error globales
│   │   ├── core/                      # Núcleo de configuración y utilidades
│   │   │   ├── config.py              # Carga tipada de DATABASE_URL y SQL_ECHO
│   │   │   ├── database.py            # Motor asincrónico, fábrica de sesiones y convención de nombres
│   │   │   ├── errores.py             # Jerarquía ErrorDominio, NoEncontrado, Conflicto y traductor
│   │   │   ├── modelos.py             # Registro e importación de todas las tablas SQLModel
│   │   │   └── parametros.py          # Tipos reutilizables: IdPath, LimitQuery, OffsetQuery
│   │   └── modules/                   # Módulos verticales por dominio
│   │       ├── health/                # Endpoints /health/live y /health/ready
│   │       ├── editoriales/           # models, schemas, service, router
│   │       ├── generos/               # models, schemas, service, router
│   │       ├── autores/               # models, schemas, service, router
│   │       ├── libros/                # models (Libro, LibroAutor), schemas, service, router
│   │       ├── clientes/              # models (Cliente, PerfilCliente), schemas, service, router
│   │       └── ventas/                # models (Venta, RenglonVenta), schemas, service, router
│   ├── migrations/                    # Versiones y entorno asincrónico de Alembic
│   │   ├── env.py                     # Script de ejecución asincrónica conectado a DATABASE_URL
│   │   └── versions/                  # Archivos de migración versionados
│   ├── scripts/                       # Scripts de mantenimiento y pruebas
│   │   ├── seed.py                    # Carga idempotente de datos iniciales
│   │   └── evidencia_c07.py           # Auditoría de consultas SQL sin N+1
│   └── test/                          # Pruebas HTTP ejecutables con REST Client
│       ├── 00_health.http
│       ├── 01_catalogo.http
│       ├── 02_clientes.http
│       ├── 03_ventas.http
│       └── casos_minimos.http         # Casos obligatorios C-01 a C-08
│
└── knowledge-base/                    # Base de Conocimiento canónica (10 archivos + extras)
```

---

## Seguridad

1. **Gestión de Secretos y Variables de Entorno**:
   - Ninguna credencial de acceso a base de datos ni clave de conexión reside en el código fuente.
   - El archivo `.env` se encuentra ignorado por control de versiones (`.gitignore`).
   - En Easypanel, las variables se inyectan como variables de entorno del contenedor en tiempo de ejecución.
2. **Prevención de Inyección SQL**:
   - Se utiliza SQLAlchemy 2.0 y SQLModel en modo asincrónico.
   - Todas las consultas con parámetros dinámicos (incluyendo búsquedas parciales por título `ILIKE`) utilizan parámetros ligados (`bound parameters`) gestionados por el driver `asyncpg`. No existe concatenación de cadenas SQL en ningún endpoint.
3. **Validación de Entradas Estricta y DTOs Forbid**:
   - Pydantic v2 valida tipos, longitudes de cadenas, rangos numéricos y formatos antes de invocar la capa de servicio.
   - `VentaCreate` utiliza `extra="forbid"`, bloqueando de raíz intentos de inyección de campos no permitidos como precios o totales.
4. **Protección contra Cross-Site Scripting (XSS)**:
   - En el frontend, toda inserción de contenido dinámico proveniente del usuario o de la API se realiza mediante la propiedad `element.textContent`, garantizando que cualquier fragmento de script o código HTML sea tratado como texto plano e inerte.
5. **Aislamiento de Red**:
   - La base de datos PostgreSQL no se publica a internet. Solo es accesible dentro de la red privada interna de Docker por el servicio backend.

---

## Variables de entorno

| Variable | Descripción | Ámbito | Ejemplo de Valor | Sensible |
|---|---|---|---|:---:|
| `DATABASE_URL` | URL de conexión asincrónica a PostgreSQL para SQLAlchemy y Alembic. | Backend | `postgresql+asyncpg://postgres:secret@db:5432/libreria` | **Sí** |
| `SQL_ECHO` | Booleano para activar o desactivar la impresión de sentencias SQL en la consola. | Backend | `false` (producción) / `true` (desarrollo) | No |
| `API_UPSTREAM` | Host y puerto interno del servicio FastAPI al que Nginx redirige `/api/`. | Frontend (Nginx) | `backend:8000` | No |
| `NGINX_ENVSUBST_FILTER` | Filtro de variables para evitar que Nginx sobreescriba variables nativas (`$host`, etc.). | Frontend (Nginx) | `^API_UPSTREAM$` | No |
| `PORT` | Puerto de escucha HTTP del servidor web o API. | General | `80` (Frontend) / `8000` (Backend) | No |
