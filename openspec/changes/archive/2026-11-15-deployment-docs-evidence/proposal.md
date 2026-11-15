# C-06 · deployment-docs-evidence

## Why
La entrega final de la Evaluación Global de Programación III requiere documentar el proyecto en `README.md` y `DEPLOY.md`, y proveer en `evidencia/` el reporte verificable de consultas SQL sin N+1 (`C-07_consultas.txt`), los resultados de los casos globales `G-01` a `G-07` y un script de verificación automatizada extremo a extremo.

## What Changes
- Completar `README.md` en la raíz con los integrantes del grupo, estructura del repositorio, guía de ejecución local (Docker Compose y paso a paso), carga de datos semilla (`scripts.seed`), decisión de selectores/consultas por ID y matriz de casos `G-01` a `G-07`.
- Completar `DEPLOY.md` con la ficha técnica del despliegue en Easypanel, topología de red, variables de entorno, migraciones, pasos de actualización/redespliegue y guía de diagnóstico.
- Generar `evidencia/C-07_consultas.txt` (y copia en `backend/evidencia/C-07_consultas.txt`) ejecutando `python -m scripts.evidencia_c07`, demostrando que `GET /libros/{id}` y `GET /ventas/{id}` emiten exactamente 2 sentencias SQL con `lazy="raise"`.
- Estructurar `evidencia/G-01_a_G-07/` con el registro detallado de peticiones, respuestas HTTP y estados verificados de los casos `G-01` a `G-07`, más un script reproducible de auditoría E2E (`evidencia/verificar_global.py`).

## Capabilities
### New Capabilities
- `deployment-docs-evidence`: documentación de entrega final, auditoría de consultas SQL sin N+1 y evidencia reproducible de los casos globales G-01 a G-07.

### Modified Capabilities
Ninguna.

## Impact
Agrega y consolida `README.md`, `DEPLOY.md` y la carpeta `evidencia/` exigidos en el formato de entrega de la página 9 del PDF. No altera la lógica de negocio de `frontend/` ni de `backend/`.
