# backend-docker-compose Specification

## Purpose
Empaquetar el backend de FastAPI en un contenedor reproducible con Python 3.12, automatizar las migraciones con Alembic al iniciar y orquestar los servicios localmente con Docker Compose y en Easypanel.

## Requirements

### Requirement: Imagen Docker del backend
La imagen Docker del backend MUST basarse en `python:3.12-slim`, instalar las dependencias fijadas en `requirements.txt` sin caché y exponer el puerto 8000 para el servidor Uvicorn.

#### Scenario: Construcción de la imagen
- **WHEN** se construye la imagen desde el contexto `backend/`
- **THEN** se instalan las dependencias requeridas y se exponen las instrucciones para ejecutar la API en `0.0.0.0:8000`

### Requirement: Migraciones automáticas en arranque
El contenedor del backend MUST aplicar automáticamente `alembic upgrade head` antes de iniciar el proceso Uvicorn, garantizando que el esquema esté actualizado antes de atender peticiones.

#### Scenario: Arranque del servicio backend
- **WHEN** se inicia el contenedor con una variable `DATABASE_URL` válida
- **THEN** Alembic ejecuta las migraciones pendientes y posteriormente arranca el servidor HTTP en el puerto 8000

### Requirement: Orquestación multi-servicio con Docker Compose
La configuración de Docker Compose MUST definir los servicios `db` (PostgreSQL 16), `backend` y `frontend`, asegurando persistencia de datos y resolución de nombres de red interna.

#### Scenario: Levantado del entorno integrado
- **WHEN** se ejecuta `docker compose up`
- **THEN** la base de datos se inicializa con volumen persistente, el backend espera a que la base esté saludable y el frontend enruta `/api/` hacia el servicio backend sin errores de CORS
