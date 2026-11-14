# Diseño · C-04 frontend-docker-nginx

## Context
C-01 está archivado y usa rutas relativas `/api/`. La regla dura de AGENTS exige `frontend/public/`, aunque C-01 y parte de la guía describen recursos en la raíz. Las pruebas los leen mediante rutas locales explícitas.

## Goals / Non-Goals
Servir el frontend y reenviar la API desde un mismo origen; conservar el contenido y las referencias relativas. No implementar Compose ni cambiar lógica del backend o funcionalidades de altas y ventas.

## Decisions
1. Mover `index.html`, `css/` y `js/` a `public/` y adaptar exclusivamente rutas de lectura del arnés: no duplicar fuentes ni modificar URLs de la página.
2. Copiar `public/` a la raíz web de la imagen oficial y colocar la plantilla en `/etc/nginx/templates/`. Exigir `API_UPSTREAM` en ejecución como host:puerto alcanzable; filtrar envsubst a esa variable.
3. Usar `location /api/` y `proxy_pass http://${API_UPSTREAM}/;`: Nginx reemplaza el prefijo, preserva la consulta y las barras de colección. Propagar las cuatro cabeceras solicitadas.
4. Validar la integración con un upstream de prueba que devuelva ruta y cabeceras; no sustituye una prueba posterior con el backend real.

## Risks / Trade-offs
Los consumidores locales que lean las rutas anteriores deben apuntar a `public/`. La resolución de `API_UPSTREAM` requiere un nombre accesible al iniciar Nginx. El backend real y su base dependen de configuración externa a C-04.
