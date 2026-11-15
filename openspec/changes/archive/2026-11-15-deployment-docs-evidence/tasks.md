# Tasks · C-06 deployment-docs-evidence

## 1. Documentación de Entrega
- [x] 1.1 Completar `README.md` en la raíz con integrantes, estructura, ejecución local (Docker Compose y paso a paso), semilla `scripts.seed`, opción elegida para selectores y casos `G-01` a `G-07`.
- [x] 1.2 Completar `DEPLOY.md` con ficha técnica de despliegue, pasos en Easypanel, variables de entorno, migraciones, pasos de actualización y guía de diagnóstico.

## 2. Evidencia de Consultas SQL y Casos Globales
- [x] 2.1 Generar `evidencia/C-07_consultas.txt` (y copia en `backend/evidencia/C-07_consultas.txt`) con las 2 consultas fijas de `GET /libros/1`, `GET /libros/5`, `GET /ventas/1` y `GET /ventas/2`.
- [x] 2.2 Crear `evidencia/G-01_a_G-07/` con los reportes detallados de ejecución y verificación de los casos `G-01` a `G-07` y el índice `evidencia/README.md`.
- [x] 2.3 Crear `evidencia/verificar_global.py` para auditar automáticamente los casos `G-01` a `G-07` contra el backend/proxy.

## 3. Verificación y Cierre
- [x] 3.1 Ejecutar las pruebas automatizadas del frontend (`node --test frontend/tests/*.test.cjs`), validar el change en OpenSpec y actualizar `CHANGES.md`.
