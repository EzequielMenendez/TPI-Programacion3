# DevOps y Despliegue en Easypanel

Este documento detalla la guía operativa de los **5 pasos para el despliegue**, la configuración de contenedores Docker, la parametrización de Nginx como Reverse Proxy, y el protocolo de verificación de los **Casos de prueba G-01 a G-07** exigidos por la consigna de la Evaluación Global de Programación III.

---

## Guía de Despliegue en 5 Pasos

### Paso 1: Dockerfile del Frontend

El frontend se empaqueta utilizando la imagen oficial ligera `nginx:1.30-alpine`. Se copian los archivos estáticos a la ruta estándar de Nginx y se coloca la plantilla de configuración en el directorio de plantillas de `envsubst`:

```dockerfile
# frontend/Dockerfile
FROM nginx:1.30-alpine

# Copiar archivos estáticos de la interfaz
COPY index.html /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/

# Copiar plantilla de configuración de Nginx para sustitución con envsubst
COPY default.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

---

### Paso 2: Plantilla de Nginx (`default.conf.template`)

La imagen oficial de Nginx procesa automáticamente cualquier archivo `.template` ubicado en `/etc/nginx/templates/` antes de iniciar el servicio, sustituyendo las variables de entorno mediante `envsubst`.

Para evitar que `envsubst` intente reemplazar variables internas de Nginx (como `$host`, `$remote_addr` o `$scheme`), se utiliza la directiva de entorno `NGINX_ENVSUBST_FILTER=^API_UPSTREAM$`.

```nginx
# frontend/default.conf.template
server {
    listen 80;
    server_name localhost;

    # Servir archivos estáticos del frontend
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Reverse proxy para las llamadas a la API
    # La barra final en proxy_pass remueve automáticamente el prefijo /api/
    location /api/ {
        proxy_pass http://${API_UPSTREAM}/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

### Paso 3: Prueba Local con Docker Compose

Para validar la integración completa sin subir cambios a la nube, se provee un `docker-compose.yml` que orquesta los tres servicios localmente:

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    container_name: libreria-db
    environment:
      POSTGRES_USER: libreria_user
      POSTGRES_PASSWORD: libreria_password
      POSTGRES_DB: libreria
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U libreria_user -d libreria"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: libreria-backend
    environment:
      DATABASE_URL: postgresql+asyncpg://libreria_user:libreria_password@db:5432/libreria
      SQL_ECHO: "true"
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "8000:8000"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: libreria-frontend
    environment:
      API_UPSTREAM: backend:8000
      NGINX_ENVSUBST_FILTER: ^API_UPSTREAM$
    depends_on:
      - backend
    ports:
      - "80:80"

volumes:
  pgdata:
```

**Comando de ejecución local**:
```bash
docker compose up --build
```
Verificar accediendo a `http://localhost`: el catálogo debe cargar sin advertencias ni bloqueos de CORS en la consola del navegador.

---

### Paso 4: Dockerfile del Backend

El backend se construye con Python 3.12-slim, instalando las dependencias necesarias y garantizando la ejecución de migraciones antes de iniciar el servidor Uvicorn:

```dockerfile
# backend/Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Instalar dependencias del sistema mínimas si fueran necesarias
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar requerimientos
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código de la aplicación, configuración de migraciones y scripts
COPY app/ app/
COPY migrations/ migrations/
COPY scripts/ scripts/
COPY alembic.ini .

EXPOSE 8000

# Ejecutar migraciones con Alembic y levantar Uvicorn
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
```

---

### Paso 5: Despliegue de Servicios en Easypanel

En la consola de gestión de Easypanel, se configuran tres servicios dentro del mismo proyecto:

#### 1. Servicio Base de Datos (`postgres`)
- **Tipo**: PostgreSQL (Template oficial o Docker Image `postgres:16-alpine`).
- **Variables de Entorno**:
  - `POSTGRES_DB`: `libreria`
  - `POSTGRES_USER`: `postgres`
  - `POSTGRES_PASSWORD`: `<contraseña_segura>`
- **Persistencia**: Montar un volumen persistente en `/var/lib/postgresql/data`.

#### 2. Servicio Backend (`backend`)
- **Tipo**: App / Dockerfile apuntando al directorio `backend/` del repositorio Git.
- **Puerto**: `8000`.
- **Variables de Entorno**:
  - `DATABASE_URL`: `postgresql+asyncpg://postgres:<contraseña_segura>@<nombre_servicio_db>:5432/libreria`
  - `SQL_ECHO`: `false`
- **Dominio**: Opcional / interno (solo necesita ser accesible por el frontend en la red interna).

#### 3. Servicio Frontend (`frontend`)
- **Tipo**: App / Dockerfile apuntando al directorio `frontend/` del repositorio Git.
- **Puerto**: `80`.
- **Variables de Entorno**:
  - `API_UPSTREAM`: `<nombre_servicio_backend>:8000`
  - `NGINX_ENVSUBST_FILTER`: `^API_UPSTREAM$`
- **Dominio**: Público con certificado SSL/TLS automático (`https://tu-libreria.tudominio.com`).

---

## Casos de Prueba de la Evaluación Global (G-01 a G-07)

Estos casos componen la batería de pruebas oficial para validar la integración y despliegue del sistema:

| Caso | Objetivo | Procedimiento | Resultado Esperado | Evidencia Requerida |
|---|---|---|---|---|
| **G-01** | Carga y filtro de catálogo desde la API | Abrir la URL pública, verificar carga de libros iniciales y escribir en el buscador `"RAYU"`. | El catálogo carga desde `GET /api/libros/`. La búsqueda filtra insensible a mayúsculas y muestra únicamente *Rayuela*. | Captura de pantalla de la búsqueda y registro de red en DevTools (`/api/libros/?titulo=RAYU`). |
| **G-02** | Alta de libro y verificación | Completar el formulario `#form-libro` con datos válidos, editorial, género y al menos un autor con rol. Enviar. | Respuesta HTTP 201 Created. Formulario limpio, alerta de éxito con ID asignado, libro visible en tabla y en catálogo. | Captura de pantalla del formulario limpio tras 201 y fila agregada en la tabla. |
| **G-03** | Rechazo de ISBN duplicado y conservación de borrador | Completar el alta de libro usando el ISBN de un libro existente (ej. `978-950-07-0386-1`). Enviar. | Respuesta HTTP 409 Conflict. Mensaje amigable (`"Ya existe un libro con ese ISBN."`). **El borrador permanece intacto en pantalla**. | Captura del mensaje de error 409 con todos los campos del formulario aún completos. |
| **G-04** | Rechazo de email duplicado y conservación de borrador | Intentar dar de alta un cliente con el correo `ana@example.com` (o `ANA@example.com`). Enviar. | Respuesta HTTP 409 Conflict (`"Ya existe un cliente con ese email."`). **El borrador de cliente permanece en pantalla**. | Captura de la alerta de error y preservación del nombre del cliente en el input. |
| **G-05** | Venta multirrenglón y descuento de stock | Seleccionar un cliente y agregar dos libros distintos con cantidades válidas. Confirmar venta. | HTTP 201 Created. Total calculado por servidor, stock reducido en base, borrador vaciado, comprobante en logs. | Captura del mensaje de confirmación con total calculado y log del servidor mostrando comprobante. |
| **G-06** | Inmutabilidad de precios históricos congelados | 1. Confirmar una venta con Rayuela ($ 25.000).<br>2. Cambiar precio de Rayuela a $ 35.000 vía `PATCH /api/libros/1`.<br>3. Consultar detalle de la venta en `#historial`. | El catálogo muestra Rayuela a $ 35.000, pero el detalle de la venta histórica conserva inalterado el precio unitario de $ 25.000 y el total original. | Captura comparativa: catálogo con precio nuevo vs detalle de venta con precio histórico congelado. |
| **G-07** | Rechazo por stock insuficiente | Intentar confirmar una venta de un libro solicitando una cantidad superior a su stock actual. | Respuesta HTTP 409 Conflict. La venta no se crea, el stock no varía y el borrador de venta permanece cargado para corrección. | Captura del mensaje de stock insuficiente y borrador preservado en la interfaz. |

---

## Documentación y Evidencia de Entrega

Para la entrega formal del TPI Global se deben generar y versionar:

1. **`DEPLOY.md`**: Guía paso a paso con la URL pública activa en Easypanel, credenciales ficticias de prueba, instrucciones para evaluadores y resumen de la arquitectura.
2. **Carpeta `evidencia/`**:
   - `evidencia/C-07_consultas.txt`: Registro de auditoría de sentencias SQL demostrando 2 consultas exactas sin N+1.
   - `evidencia/G-01_a_G-07/`: Capturas de pantalla numeradas respaldando cada uno de los casos de prueba aprobados en el entorno desplegado.
