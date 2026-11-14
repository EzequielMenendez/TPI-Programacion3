# C-05 · backend-docker-compose

## Why
El backend FastAPI requiere un empaquetado reproducible en contenedor con Python 3.12, migraciones automáticas en arranque mediante Alembic y orquestación multi-servicio local junto a PostgreSQL y Nginx frontend a través de Docker Compose, satisfaciendo los requisitos de contenedorización y despliegue del Ejercicio 5 de la Evaluación Global de Programación III.

## What Changes
- Crear `backend/Dockerfile` con Python 3.12-slim, herramientas de verificación, instalación sin caché de dependencias y comando de inicio que aplica `alembic upgrade head` antes de lanzar Uvicorn en `0.0.0.0:8000`.
- Crear `backend/.dockerignore` para excluir archivos `.env`, entornos virtuales `.venv`, cachés `__pycache__` y metadatos de Git del contexto de build.
- Proveer `backend/requirements.txt` y `backend/env.example` en `backend/` para asegurar que el build path `/backend` en Easypanel sea completamente autocontenido.
- Crear `docker-compose.yml` en la raíz del proyecto con 3 servicios orquestados (`db` PostgreSQL 16 con volumen persistente y healthcheck, `backend` con dependencia saludable hacia la base de datos, y `frontend` con reverse proxy hacia `backend:8000`).
- Documentar en `DEPLOY.md` las instrucciones operativas de configuración en Easypanel (servicios App y Postgres, build paths, variables de entorno `API_UPSTREAM` y `DATABASE_URL`, y ejecución de casos G-01 a G-07).

## Capabilities
### New Capabilities
- `backend-docker-compose`: empaquetado del backend con migraciones automáticas y orquestación de servicios locales y para Easypanel.

### Modified Capabilities
Ninguna.

## Impact
Afecta el empaquetado del backend (`backend/`), la configuración multi-contenedor de la raíz (`docker-compose.yml`) y la documentación de despliegue (`DEPLOY.md`). No altera los contratos REST ni los modelos de base de datos existentes.
