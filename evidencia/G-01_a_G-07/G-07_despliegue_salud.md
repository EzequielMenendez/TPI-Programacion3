# Evidencia · Caso G-07: Construcción de Imágenes, Salud de la API, Proxy sin CORS y Persistencia tras Redespliegue

## Objetivo de la Consigna
> La imagen del frontend se construye. La URL pública abre por HTTPS, la API devuelve `200` en salud y los datos siguen tras un redespliegue.

---

## 1. Construcción y Validación de Imágenes Docker

### Imagen del Frontend (`frontend/Dockerfile`)
- **Imagen base**: `nginx:1.30-alpine`
- **Sustitución acotada**: `ENV NGINX_ENVSUBST_FILTER=^API_UPSTREAM$`
- **Recursos estáticos**: `COPY public/ /usr/share/nginx/html/`
- **Plantilla de proxy**: `COPY default.conf.template /etc/nginx/templates/default.conf.template`
- **Validación de configuración Nginx (`nginx -t`)**:
  ```text
  /docker-entrypoint.sh: Running envsubst on /etc/nginx/templates/default.conf.template to /etc/nginx/conf.d/default.conf
  nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
  nginx: configuration file /etc/nginx/nginx.conf test is successful
  ```

### Imagen del Backend (`backend/Dockerfile`)
- **Imagen base**: `python:3.12-slim`
- **Comando de inicio**:
  ```dockerfile
  CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]
  ```
- Al iniciar el contenedor, Alembic aplica las migraciones pendientes y Uvicorn queda escuchando en `0.0.0.0:8000`.

---

## 2. Verificación de Salud (`/api/health/live` y `/api/health/ready`)

- **Petición a través del proxy Nginx del frontend**:
  ```http
  GET /api/health/ready HTTP/1.1
  ```
- **Reenvío interno de Nginx (`proxy_pass http://${API_UPSTREAM}/;`)**:
  ```http
  GET /health/ready HTTP/1.1
  Host: localhost
  ```
- **Respuesta del servidor (`200 OK`)**:
  ```json
  {
    "estado": "listo",
    "base": "ok"
  }
  ```
- **Verificación desde Shell del contenedor backend (comando de la página 7 del PDF)**:
  ```bash
  URL=http://127.0.0.1:8000/health/ready
  python -c "from urllib.request import urlopen; print(urlopen('$URL').status)"
  # Salida: 200
  ```

---

## 3. Persistencia de Datos en PostgreSQL tras Redespliegue

1. Se registran altas de libros, clientes y ventas desde la interfaz pública (`https://<dominio-easypanel>/`).
2. Se ejecuta un redespliegue (**Deploy**) de los servicios `frontend` y `backend` en Easypanel (o `docker compose up --build -d` en local).
3. El contenedor `backend` corre `alembic upgrade head` de forma idempotente sobre el volumen persistente `/var/lib/postgresql/data` sin truncar tablas.
4. Al reabrir la URL pública y consultar el **Catálogo** (`GET /api/libros/`) y el **Historial** (`GET /api/ventas/`), todos los libros, clientes y ventas registrados antes del redespliegue continúan disponibles con sus importes intactos.
