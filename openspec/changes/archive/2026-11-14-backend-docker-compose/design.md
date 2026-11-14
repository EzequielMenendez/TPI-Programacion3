# Diseño · C-05 backend-docker-compose

## Context
El backend FastAPI interactúa con PostgreSQL mediante SQLAlchemy 2.0 y asyncpg, requiriendo migraciones gestionadas por Alembic. Para Easypanel y la regla dura #5 de `AGENTS.md`, `backend/` debe ser autocontenido (Dockerfile, .dockerignore, requirements.txt, alembic.ini, migrations, env.example) para ser compilado con el Build Path `/backend`. El frontend ya fue dockerizado en C-04 con Nginx como reverse proxy.

## Goals / Non-Goals
**Goals:**
- Empaquetar el backend en una imagen `python:3.12-slim` con herramientas de diagnóstico y dependencias instaladas sin caché.
- Ejecutar `alembic upgrade head` automáticamente antes de iniciar Uvicorn para asegurar consistencia del esquema de base de datos.
- Proveer `docker-compose.yml` unificando `db` (Postgres 16), `backend` y `frontend` con persistencia mediante volumen y healthcheck.
- Proveer `DEPLOY.md` con las especificaciones de despliegue para Easypanel y pasos de verificación de casos G-01 a G-07.

**Non-Goals:**
- Modificar modelos de datos, esquemas Pydantic o endpoints de la API.
- Reconfigurar el servidor frontend ya probado en C-04.

## Decisions
1. **Autocontención de `backend/`**: duplicar/mantener `requirements.txt` y `env.example` dentro de `backend/` de modo que tanto el build local desde raíz como el build en Easypanel con context/build path `/backend` encuentren todos sus archivos sin depender de la raíz.
2. **Arranque con migraciones y exec**: emplear `CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]`. El uso de `exec` transfiere el PID 1 al proceso Python permitiendo el apagado graceful de señales SIGTERM.
3. **Control de dependencias en Compose**: configurar `condition: service_healthy` en la dependencia de `backend` hacia `db`, utilizando `pg_isready -U libreria_user -d libreria` para evitar caídas por conexión rechazada antes del inicio de PostgreSQL.
4. **Proxy transparente sin CORS**: el frontend en Compose expone el puerto 80 y reenvía `/api/` a `backend:8000`, replicando con exactitud la topología de red de Easypanel.

## Risks / Trade-offs
- **[Migraciones fallidas al inicio]** → Si una migración falla, el contenedor se detiene inmediatamente antes de abrir el puerto 8000, evitando que la API sirva tráfico con esquema inconsistente.
- **[Conexión a PostgreSQL en red interna]** → `DATABASE_URL` debe usar el nombre del servicio de la red interna (`db` en compose o `<nombre_servicio_postgres>` en Easypanel). Se documenta explícitamente en `DEPLOY.md` y `env.example`.
