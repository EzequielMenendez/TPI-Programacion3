# C-04 · frontend-docker-nginx

## Why
El frontend necesita una imagen desplegable que sirva sus recursos y exponga la API bajo el mismo origen, eliminando el prefijo `/api/` antes de llegar a FastAPI.

## What Changes
- Separar los recursos públicos en `frontend/public/` y adaptar las rutas del arnés de pruebas sin alterar funcionalidades.
- Crear imagen Nginx 1.30-alpine, plantilla de proxy parametrizada y exclusiones del contexto de build.
- Verificar imagen, configuración, recursos y proxy HTTP, además de la suite existente.

## Capabilities
### New Capabilities
- `frontend-docker-nginx`: recursos estáticos y proxy de API bajo un mismo origen.

### Modified Capabilities
Ninguna.

## Impact
Afecta el empaquetado y las rutas de pruebas del frontend. C-05, Compose, el backend y la lógica de C-02/C-03 quedan fuera de alcance.
