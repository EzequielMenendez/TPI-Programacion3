# Validación · C-04

- C-01: figura completado y archivado en `2026-11-13-frontend-api-client-catalog`.
- Antes de mover los recursos: `node --test tests/*.test.cjs` desde `frontend/`, 7 archivos aprobados. Tras adaptar las rutas, fallaron antes del traslado y volvieron a aprobarse (7/7) después.
- `docker build -t c04-frontend-nginx:local frontend`: aprobado. Una primera prueba HTTP detectó 403 por permisos restrictivos en el contexto; se agregaron permisos de lectura y recorrido dentro de la imagen y se reconstruyó.
- `nginx -t` dentro de la imagen reconstruida: aprobado. La configuración generada preservó las variables internas y sustituyó `API_UPSTREAM`.
- HTTP en `127.0.0.1:18080`: `/` y los diez recursos CSS/JS referenciados por HTML devolvieron 200 con tipos correspondientes.
- Proxy con upstream Nginx de prueba: `/api/libros/?limit=20&offset=0` llegó como `/libros/?limit=20&offset=0`; se observaron Host, X-Real-IP, X-Forwarded-For (incluida una IP previa) y X-Forwarded-Proto. El navegador solicita rutas relativas del mismo origen; no se activó CORS. Esto no acredita la integración con FastAPI real ni un navegador real.
- Integración real: PostgreSQL 16 temporal con migraciones Alembic y seed (5 libros); FastAPI ejecutado con dependencias aisladas y Nginx de la imagen. `/api/health/live`, `/api/health/ready`, `/api/openapi.json`, `/api/libros/?limit=20&offset=0`, búsqueda `titulo=RAYU` y `/api/libros/1` respondieron 200. El listado devolvió 5 libros, la búsqueda devolvió Rayuela y el detalle incluyó autorías. No se recibieron cabeceras CORS; las solicitudes usaron el mismo origen. No se realizó prueba en navegador real.
- El CLI `openspec` no estaba disponible; los artefactos, sincronización de la especificación y archivo se realizaron siguiendo el formato `spec-driven` existente.
