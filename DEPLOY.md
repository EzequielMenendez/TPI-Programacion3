# Guía de Despliegue · Librería Páginas del Sol (Easypanel & Docker)

> Manual operativo para la configuración, puesta en marcha, actualización y auditoría de la aplicación en **Easypanel (VPS)** y en **entorno local (Docker Compose)**, conforme a las consignas del Global de Programación III (Ejercicios 4 y 5, Casos G-01 a G-07).

---

## 1. Ficha Técnica del Despliegue

| Parámetro | Configuración / Valor |
|---|---|
| **Integrantes del grupo** | Ignacio Rodríguez · Ezequiel Menéndez · Mateo Algañaraz · Nicolás Morón · Santiago Barretto |
| **Repositorio y rama** | `https://github.com/EzequielMenendez/TPI-Programacion3` (rama `main`) |
| **URL pública (Easypanel)** | [https://grupo3-mateo-frontend.ugpvou.easypanel.host/](https://grupo3-mateo-frontend.ugpvou.easypanel.host/) |
| **Endpoint de salud público** | `https://grupo3-mateo-frontend.ugpvou.easypanel.host/api/health/ready` → `200 OK` `{"estado":"listo","base":"ok"}` |
| **Revisión desplegada** | commit `a28678f` de `main` |
| **Proyecto Easypanel** | `grupo3-mateo` · servicios `db-global` (Postgres 16), `backend` (App) y `frontend` (App) |
| **Build Path Frontend** | `/frontend` (Builder: `Dockerfile`, ruta relativa: `Dockerfile`) |
| **Build Path Backend** | `/backend` (Builder: `Dockerfile`, ruta relativa: `Dockerfile`) |
| **Puertos internos** | Frontend (Nginx): `80` (HTTP) · Backend (Uvicorn): `8000` (HTTP) · PostgreSQL: `5432` (privado) |
| **Regla de Reverse Proxy** | `location /api/ { proxy_pass http://${API_UPSTREAM}/; }` (con barra final para reemplazar `/api/` por `/`) |
| **Nombres de variables de entorno** | Frontend: `API_UPSTREAM`, `NGINX_ENVSUBST_FILTER` · Backend: `DATABASE_URL`, `SQL_ECHO` · DB: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` |
| **Migraciones de esquema** | `alembic upgrade head` (ejecutado automáticamente en el `CMD` de `backend/Dockerfile` al iniciar) |
| **Carga inicial de datos (`seed`)** | `python -m scripts.seed` (ejecutado desde la pestaña **Shell** del servicio `backend`) |

---

## 1.1 Registro del Despliegue Realizado (15/11/2026)

| Paso | Configuración aplicada | Resultado observado |
|---|---|---|
| Postgres | Servicio `db-global`, imagen `postgres:16-alpine`, base `libreria`, usuario `libreria_user`, contraseña generada por Easypanel. Host interno `grupo3-mateo_db-global:5432`, sin exponer. | En ejecución. |
| Backend | App `backend`, Git `https://github.com/EzequielMenendez/TPI-Programacion3.git` rama `main`, Build Path `/backend`, Dockerfile `Dockerfile`. Environment: `DATABASE_URL=postgresql+asyncpg://libreria_user:***@grupo3-mateo_db-global:5432/libreria`, `SQL_ECHO=false`. Se eliminó el dominio público automático: solo queda `http://grupo3-mateo_backend:80/` interno. | Build OK. Logs: `alembic upgrade head` aplicó `474a246cb918` y `f3bb61a7b792`; `Uvicorn running on http://0.0.0.0:8000`. Shell: health → `200`. |
| Carga inicial | Shell del backend: `python -m scripts.seed` (una sola vez, base nueva). | `Datos iniciales cargados: 3 editoriales, 3 géneros, 5 autores, 5 libros, 2 clientes, 1 venta.` |
| Frontend | App `frontend`, mismo repo/rama, Build Path `/frontend`, Dockerfile `Dockerfile`. Environment: `API_UPSTREAM=grupo3-mateo_backend:8000`. Domains: `https://grupo3-mateo-frontend.ugpvou.easypanel.host` → HTTP, puerto `80`. | Build OK. `https://grupo3-mateo-frontend.ugpvou.easypanel.host/api/health/ready` → `200`. |
| Verificación | `python evidencia/verificar_global.py https://grupo3-mateo-frontend.ugpvou.easypanel.host/api` | G-01 a G-07 OK (ver `evidencia/G-01_a_G-07/salida_verificador_url_publica.txt`). |
| Redespliegue | Deploy de `backend` y `frontend` sin volver a correr el seed. | Health `200`; ventas `1`, `2` y `4` y los 7 libros siguen disponibles con sus importes. |

---

## 2. Arquitectura y Topología de Red

El despliegue se organiza en **tres servicios** dentro de un mismo proyecto en Easypanel o en una red interna de Docker Compose:

```text
                  ┌─────────────────────────────────────────────────────────┐
                  │                 RED PÚBLICA (Internet)                  │
                  └────────────────────────────┬────────────────────────────┘
                                               │ HTTPS (SSL Let's Encrypt :443)
                                               ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ RED PRIVADA (VPS / Docker Network)                                                        │
│                                                                                           │
│   ┌───────────────────────────┐                                                           │
│   │    Servicio: frontend     │                                                           │
│   │    (Nginx 1.30-alpine)    │                                                           │
│   │                           │                                                           │
│   │  - Puerto interno: :80    │                                                           │
│   │  - Servir frontend/public │                                                           │
│   │  - location /api/ ───────┼─────────────┐ (proxy_pass http://${API_UPSTREAM}/;)       │
│   └───────────────────────────┘             │                                             │
│                                             ▼                                             │
│                               ┌───────────────────────────┐                               │
│                               │    Servicio: backend      │                               │
│                               │  (FastAPI - Python 3.12)  │                               │
│                               │                           │                               │
│                               │  - Puerto interno: :8000  │                               │
│                               │  - alembic upgrade head   │                               │
│                               │  - uvicorn app.main:app   │                               │
│                               └─────────────┬─────────────┘                               │
│                                             │ asyncpg (puerto privado :5432)              │
│                                             ▼                                             │
│                               ┌───────────────────────────┐                               │
│                               │    Servicio: postgres     │                               │
│                               │    (PostgreSQL 16)        │                               │
│                               │                           │                               │
│                               │  - Base de datos libreria │                               │
│                               │  - Volumen persistente    │                               │
│                               └───────────────────────────┘                               │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Despliegue en Easypanel (Paso a Paso)

Crear un proyecto en la consola de Easypanel (por ejemplo `grupo1`) y configurar los tres servicios:

### Servicio 1: Base de Datos (`postgres`)
1. En el proyecto, seleccionar **New Service** → **Postgres**.
2. Asignar el nombre del servicio: `postgres` (o consultar host y puerto internos en **Credentials**).
3. En **Credentials / Environment**, definir los nombres de variables (con valores privados en el servidor):
   - `POSTGRES_DB`: `libreria`
   - `POSTGRES_USER`: `libreria_user`
   - `POSTGRES_PASSWORD`: `<contraseña_privada>`
4. **Persistencia**: Asegurar el volumen persistente en `/var/lib/postgresql/data`.
5. **Seguridad de red**: Mantener el puerto `5432` privado dentro de la red interna (no exponer al exterior).

### Servicio 2: Backend REST API (`backend`)
1. Seleccionar **New Service** → **App** y asignarle el nombre `backend`.
2. En **Source**:
   - Seleccionar el repositorio Git y la rama `main`.
   - Configurar **Build Path**: `/backend`
3. En **Build**:
   - Seleccionar **Dockerfile** como builder y escribir `Dockerfile` como ruta relativa.
4. En **Environment**:
   ```env
   DATABASE_URL=postgresql+asyncpg://libreria_user:<contraseña_privada>@<host_interno_postgres>:5432/libreria
   SQL_ECHO=false
   ```
5. En **Deploy**:
   - Pulsar **Deploy** y revisar los logs de construcción y arranque.
   - Confirmar en los logs que `alembic upgrade head` se ejecute antes de que Uvicorn escuche en `0.0.0.0:8000`.
6. **Comprobación de salud y carga inicial desde Shell**:
   - Abrir la pestaña **Shell** del servicio `backend` y comprobar la salud:
     ```bash
     URL=http://127.0.0.1:8000/health/ready
     python -c "from urllib.request import urlopen; print(urlopen('$URL').status)"
     ```
     *(Debe imprimir `200`).*
   - Ejecutar la carga inicial de datos ficticios:
     ```bash
     python -m scripts.seed
     ```
     *(Nota: `scripts.seed` vacía las tablas y carga el estado inicial conocido; no ejecutarlo nuevamente si se desean conservar altas y ventas posteriores).*
7. **Red**: Conservar el `backend` únicamente en la red interna y quitar su dominio público automático si Easypanel le asignó uno.

### Servicio 3: Frontend y Reverse Proxy (`frontend`)
1. Seleccionar **New Service** → **App** y asignarle el nombre `frontend`.
2. En **Source**:
   - Seleccionar el repositorio Git y la rama `main`.
   - Configurar **Build Path**: `/frontend`
3. En **Build**:
   - Seleccionar **Dockerfile** como builder y `Dockerfile` como ruta relativa.
4. En **Environment**:
   - Configurar `API_UPSTREAM` con el nombre interno del servicio backend y su puerto (`<proyecto>_backend:8000`):
     ```env
     API_UPSTREAM=grupo1_backend:8000
     NGINX_ENVSUBST_FILTER=^API_UPSTREAM$
     ```
5. En **Domains**:
   - Usar el dominio HTTPS asignado al frontend.
   - Configurar **HTTP** como protocolo interno y **80** como puerto de destino.
6. Guardar los cambios y pulsar **Deploy**.
   - Abrir `https://<dominio-publico>/api/health/ready` y verificar que responde `200`.
   - Abrir `https://<dominio-publico>/` y probar el catálogo y el registro de una venta.

### Pasos de Actualización y Redespliegue
1. Subir los nuevos commits a la rama `main` del repositorio en GitHub (`git push origin main`).
2. En Easypanel, ingresar al servicio modificado (`backend` y/o `frontend`) y pulsar **Deploy**.
3. Al iniciar el nuevo contenedor de `backend`, `alembic upgrade head` aplica de forma idempotente cualquier migración pendiente sin borrar los datos existentes en el volumen de PostgreSQL.
4. No volver a ejecutar `python -m scripts.seed` tras actualizar para preservar las altas y ventas registradas.
5. Verificar en la URL pública que `/api/health/ready` devuelve `200` y que los libros, clientes y ventas previos siguen disponibles.

---

## 4. Ejecución Local con Docker Compose

Para reproducir localmente la topología completa de los 3 servicios:

```bash
# 1. Construir las imágenes y levantar db, backend y frontend
docker compose up --build -d

# 2. Cargar los datos ficticios iniciales
docker compose exec backend python -m scripts.seed

# 3. Verificar en el navegador
# Interfaz web:         http://localhost
# Salud vía proxy:      http://localhost/api/health/ready
# Documentación API:    http://localhost:8000/docs
```

---

## 5. Guía de Diagnóstico

| Si ves esto | Revisá esto |
|---|---|
| **Falla un `COPY`** | El Build Path (`/frontend` o `/backend`), los nombres exactos de los archivos y la carpeta `public/`. |
| **Nginx no arranca o `/api/` devuelve `502`** | Los logs del frontend, `API_UPSTREAM`, el nombre interno del servicio backend, el puerto `8000` y si el backend está en ejecución. |
| **`/api/health/ready` falla** | Los logs del backend, `DATABASE_URL` (driver `postgresql+asyncpg`), la conexión a PostgreSQL y las migraciones (`alembic upgrade head`). |
| **Una petición de la API devuelve `404`** | En la pestaña Red del navegador, verificá el prefijo `/api` y la ruta del backend, incluida su barra final cuando corresponda (`/api/libros/`, `/api/ventas/`) y la barra final en `proxy_pass http://${API_UPSTREAM}/;`. |

---

## 6. Casos de Prueba y Verificación (`G-01` a `G-07`)

| Caso | Procedimiento | Resultado esperado |
|---|---|---|
| **G-01 · Catálogo** | Buscar por título (ej. `"RAYU"`), avanzar con `limit` y `offset` y probar una búsqueda sin coincidencias. Abrir el detalle de un libro con «Ver autores». | `GET /api/libros/` filtra sin distinguir mayúsculas, pagina desde `offset=0`, diferencia búsqueda sin coincidencias y `GET /api/libros/{id}` muestra los autores ordenados y «Sin clasificar» cuando el género es nulo. |
| **G-02 · Alta de libro** | Crear un libro con stock entero $\ge 0$, género opcional y autorías con rol. Consultar el detalle. Repetir el ISBN y enviar. | El alta válida devuelve `201 Created`, limpia el formulario y actualiza las vistas. Al repetir el ISBN devuelve `409 Conflict`, muestra el mensaje del servidor y conserva el borrador en el formulario. |
| **G-03 · Alta de cliente** | Crear un cliente con nombre y email y recuperarlo por ID (`GET /api/clientes/{id}`). Repetir el email y enviar. | El alta válida devuelve `201 Created` y la búsqueda por ID muestra su nombre. Al repetir el email devuelve `409 Conflict` y conserva los datos en el formulario. |
| **G-04 · Venta** | Registrar una venta válida con dos renglones. Verificar el `201` y consultar el detalle en el historial después de recargar la página. | `POST /api/ventas/` devuelve `201 Created` con precios unitarios, subtotales y total calculados por la API. Tras recargar la página, `GET /api/ventas/{id}` devuelve el mismo detalle desde PostgreSQL. |
| **G-05 · Precio histórico** | Cambiar el precio de un libro vendido con `PATCH /libros/{id}` y verificar la venta anterior en el historial. | El catálogo muestra el nuevo precio del libro, pero la venta anterior conserva intactos sus importes históricos (`precio_unitario`, subtotales y `total`). |
| **G-06 · Rechazo** | Probar una venta con un ID inexistente o stock insuficiente (`409`) y renglones con libros repetidos (`422`). | El servidor responde `409` y `422` respectivamente, se conserva el borrador de la venta sin limpiar y el historial queda sin cambios. |
| **G-07 · Despliegue** | Construir la imagen del frontend, abrir la URL pública por HTTPS, consultar `/api/health/ready` y redesplegar el servicio. | La imagen se construye, la URL pública abre por HTTPS, `/api/health/ready` responde `200` y los datos en PostgreSQL siguen disponibles tras un redespliegue. |
