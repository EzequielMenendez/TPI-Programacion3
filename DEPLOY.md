# Guía de Despliegue · Librería Páginas del Sol (Easypanel & Docker)

> Manual operativo para la configuración, puesta en marcha y auditoría de la aplicación en **Easypanel (VPS)** y en **entorno local (Docker Compose)**, conforme a las consignas del Global de Programación III (Ejercicios 4 y 5, Casos G-01 a G-07).

---

## 1. Arquitectura y Topología de Red

El despliegue se organiza en **tres servicios** dentro de un mismo proyecto en Easypanel o en una red interna de Docker Compose:

```
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

## 2. Despliegue en Easypanel (Paso a Paso)

Crear un proyecto nuevo en la consola de Easypanel (por ejemplo `libreria-grupo`) y configurar los tres servicios:

### Servicio 1: Base de Datos (`postgres`)
1. En el proyecto, seleccionar **New Service** → **Postgres** (o Database → PostgreSQL).
2. Asignar el nombre del servicio: `postgres` (o `db`).
3. En **Credentials / Environment**, definir las credenciales:
   - `POSTGRES_DB`: `libreria`
   - `POSTGRES_USER`: `libreria_user`
   - `POSTGRES_PASSWORD`: `<contraseña_segura>`
4. **Persistencia**: Asegurar el montaje de volumen persistente en `/var/lib/postgresql/data`.
5. **Seguridad de red**: Mantener el puerto `5432` privado dentro de la red del proyecto (no publicar hacia el exterior).

### Servicio 2: Backend REST API (`backend`)
1. Seleccionar **New Service** → **App** y asignarle el nombre `backend`.
2. En la pestaña **Source**:
   - Seleccionar el repositorio Git y la rama de entrega (ej. `main`).
   - Configurar **Build Path**: `/backend`
3. En la sección **Build**:
   - Seleccionar **Dockerfile** como builder.
   - Configurar la ruta relativa del Dockerfile: `Dockerfile`
4. En la pestaña **Environment**:
   ```env
   DATABASE_URL=postgresql+asyncpg://libreria_user:<contraseña_segura>@postgres:5432/libreria
   SQL_ECHO=false
   ```
   *(Nota: si el servicio Postgres se llama distinto, ajustar el host en la URL).*
5. En la sección **Deploy**:
   - La imagen ejecuta automáticamente `alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000`.
   - Pulsar **Deploy** y verificar en los logs que las migraciones se apliquen con éxito.
6. **Carga inicial de datos de prueba**:
   - Abrir la pestaña **Shell** del servicio `backend` en Easypanel y ejecutar:
     ```bash
     python -m scripts.seed
     ```
   - Comprobar la salud del backend en la misma consola con:
     ```bash
     python -c "from urllib.request import urlopen; print(urlopen('http://127.0.0.1:8000/health/ready').status)"
     ```
     *(Debe imprimir `200`).*
7. **Red**: Mantener este servicio en la red interna y remover cualquier dominio público que Easypanel le asigne por defecto.

### Servicio 3: Frontend y Reverse Proxy (`frontend`)
1. Seleccionar **New Service** → **App** y asignarle el nombre `frontend`.
2. En la pestaña **Source**:
   - Seleccionar el repositorio Git y la rama de entrega (`main`).
   - Configurar **Build Path**: `/frontend`
3. En la sección **Build**:
   - Seleccionar **Dockerfile** como builder.
   - Ruta relativa del Dockerfile: `Dockerfile`
4. En la pestaña **Environment**:
   ```env
   API_UPSTREAM=backend:8000
   NGINX_ENVSUBST_FILTER=^API_UPSTREAM$
   ```
5. En la pestaña **Domains**:
   - Configurar el dominio HTTPS asignado (ej. `https://libreria.tudominio.com`).
   - Protocolo interno: **HTTP**.
   - Puerto de destino interno: **80**.
6. Pulsar **Deploy**.
   - Verificar accediendo a `https://<dominio-publico>/api/health/ready` (debe responder `200 OK`).
   - Abrir `https://<dominio-publico>/` en el navegador: el catálogo debe renderizar los datos iniciales sin errores de CORS.

---

## 3. Ejecución Local con Docker Compose

Para reproducir localmente la topología completa en un solo comando:

```bash
# 1. Construir las imágenes y levantar los 3 servicios
docker compose up --build

# 2. En otra terminal, inicializar la base de datos con los datos semilla
docker compose exec backend python -m scripts.seed

# 3. Acceder en el navegador
# Frontend y Proxy unificado: http://localhost
# Verificación de salud:      http://localhost/api/health/ready
# Documentación OpenAPI:      http://localhost:8000/docs (o http://localhost/api/docs si se habilita)
```

Para detener los servicios conservando los datos:
```bash
docker compose down
```

Para reiniciar desde cero eliminando los volúmenes de base de datos:
```bash
docker compose down -v
```

---

## 4. Guía de Diagnóstico y Resolución de Problemas

| Síntoma observado | Causa probable | Verificación y Solución |
|---|---|---|
| **Falla un `COPY` en el build** | Discrepancia en Build Path | En Easypanel verificar que el Build Path sea `/frontend` o `/backend`. Todos los archivos copiados en Dockerfile deben existir en esa subcarpeta. |
| **Nginx responde `502 Bad Gateway` en `/api/`** | `API_UPSTREAM` mal configurado o backend caído | Revisar los logs del backend para asegurar que Uvicorn esté escuchando en `0.0.0.0:8000`. Comprobar que `API_UPSTREAM` coincida con el nombre del servicio interno y puerto (`backend:8000`). |
| **Falla `/api/health/ready` (500)** | Fallo de conexión a PostgreSQL | Revisar los logs del backend. Verificar que `DATABASE_URL` contenga el driver `postgresql+asyncpg://` y las credenciales exactas del servicio Postgres. |
| **Petición a la API devuelve 404** | Omisión de barra final en proxy o ruta | Revisar que `proxy_pass http://${API_UPSTREAM}/;` tenga la barra final en `default.conf.template`. En el frontend, verificar que las rutas de colección incluyan la barra final obligatoria (ej: `/api/libros/`). |
| **Errores de CORS en la consola del navegador** | Consumo directo del puerto backend | El frontend debe utilizar rutas relativas con prefijo `/api/` (ej: `/api/libros/`), permitiendo que Nginx atienda todo bajo el mismo origen. |

---

## 5. Protocolo de Verificación de Casos Globales (G-01 a G-07)

Ejecutar las siguientes pruebas desde la URL pública desplegada:

### G-01 · Catálogo y búsqueda parcial insensible
- **Acción**: Ingresar a la URL principal, observar la carga de las obras iniciales. En la caja de búsqueda por título escribir `"RAYU"` (en mayúsculas).
- **Resultado esperado**: El catálogo filtra insensiblemente a mayúsculas y muestra únicamente *Rayuela*. Al presionar "Mostrar todo el catálogo" o vaciar la búsqueda, se restaura la lista completa.
- **Red**: Petición `GET /api/libros/?titulo=RAYU` responde `200 OK`.

### G-02 · Alta de libro con autorías y persistencia
- **Acción**: Ir a la sección de Altas. Completar `#form-libro` con un libro nuevo (título, ISBN único, precio positivo, stock mayor o igual a 0, editorial, género y al menos un autor marcado con su rol). Enviar formulario.
- **Resultado esperado**: La API responde `201 Created`. El formulario se vacía completamente, se muestra alerta de éxito con el ID asignado y el nuevo libro aparece tanto en la tabla como en el catálogo.

### G-03 · Rechazo de ISBN duplicado y preservación de borrador
- **Acción**: Intentar dar de alta un libro utilizando un ISBN ya registrado en la base de datos (por ejemplo `978-950-07-0386-1`).
- **Resultado esperado**: La API rechaza con HTTP `409 Conflict` (`"Ya existe un libro con ese ISBN."`). Se muestra el mensaje de error del servidor y **todos los campos completados permanecen intactos en pantalla** para corregir el ISBN sin reescribir.

### G-04 · Alta de cliente y rechazo de email duplicado
- **Acción**: Dar de alta un cliente válido con nombre y email. Luego intentar registrar otro cliente con el mismo email (o variando mayúsculas, ej: `ANA@EXAMPLE.COM`).
- **Resultado esperado**: El alta válida devuelve `201 Created` y limpia el formulario. El duplicado devuelve `409 Conflict`, muestra la advertencia y **conserva el borrador en pantalla**.

### G-05 · Registro de venta multirrenglón y descuento de stock
- **Acción**: En la sección de Ventas, seleccionar un cliente y agregar al menos dos libros con cantidades enteras positivas. Confirmar la venta.
- **Resultado esperado**: La API responde `201 Created` con el ID de venta y los importes calculados por el servidor. El formulario se vacía, el stock de los libros vendidos disminuye en el catálogo y la venta aparece en el historial.

### G-06 · Demostración de precio histórico congelado
- **Acción**:
  1. Registrar una venta con *Rayuela* a su precio actual ($ 25.000).
  2. Mediante la API o consola, actualizar el precio de catálogo de *Rayuela* a $ 35.000 (`PATCH /api/libros/1`).
  3. Consultar el detalle de la venta anterior en `#historial`.
- **Resultado esperado**: En el catálogo *Rayuela* figura a $ 35.000, pero la venta histórica conserva inmutable el precio unitario de $ 25.000 y el total original facturado.

### G-07 · Rechazo por stock insuficiente y persistencia
- **Acción**: Intentar registrar una venta solicitando una cantidad superior al stock disponible de un libro.
- **Resultado esperado**: La API rechaza con HTTP `409 Conflict`. La venta no se registra, el stock no varía y el borrador de la venta permanece en pantalla para ser corregido.
- **Persistencia**: Recargar la página o reiniciar el contenedor; los datos previamente guardados continúan disponibles en PostgreSQL.
