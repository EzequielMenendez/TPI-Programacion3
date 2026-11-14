# Tasks · C-05 backend-docker-compose

## 1. Empaquetado del Backend
- [x] 1.1 Crear `backend/requirements.txt` y `backend/env.example` para asegurar la autocontención de `backend/` para el build path `/backend`.
- [x] 1.2 Crear `backend/Dockerfile` con Python 3.12-slim, herramientas de diagnóstico, instalación sin caché de dependencias y comando `alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000`.
- [x] 1.3 Crear `backend/.dockerignore` excluyendo `.git`, `.env`, `.venv`, cachés y pruebas.

## 2. Orquestación con Docker Compose
- [x] 2.1 Crear `docker-compose.yml` en la raíz con servicios `db`, `backend` y `frontend`, con volumen persistente, dependencias con healthcheck y variables de entorno.
- [x] 2.2 Validar la sintaxis y coherencia de `docker-compose.yml` y las variables de conexión interna.

## 3. Documentación y Guía Operativa de Despliegue
- [x] 3.1 Crear `DEPLOY.md` con la especificación completa para Easypanel (Servicios App y Postgres, build paths, variables de entorno, migraciones, salud) y pasos para reproducir casos G-01 a G-07.
- [x] 3.2 Actualizar `CHANGES.md` y verificar que las suites de pruebas existentes permanezcan verdes.
