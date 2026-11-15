# Diseño · C-06 deployment-docs-evidence

## Context
Con los changes `C-01` a `C-05` implementados y archivados, resta consolidar la entrega del Global de Programación III según la página 9 del PDF: documentación principal (`README.md`), guía operativa de despliegue (`DEPLOY.md`) y la carpeta `evidencia/` con la auditoría de consultas SQL (`C-07_consultas.txt`), los reportes de los casos `G-01` a `G-07` y las pruebas de verificación extremo a extremo.

## Goals / Non-Goals
**Goals:**
- Dejar `README.md` y `DEPLOY.md` listos con integrantes, arquitectura, pasos de ejecución local y en Easypanel, variables de entorno y tabla de casos `G-01` a `G-07`.
- Generar `evidencia/C-07_consultas.txt` (y copia en `backend/evidencia/C-07_consultas.txt`) con el registro exacto de las sentencias SQL emitidas por `libros_service.obtener_detalle` y `ventas_service.obtener`.
- Estructurar `evidencia/G-01_a_G-07/` con la evidencia documentada de peticiones, respuestas HTTP y comportamiento de la interfaz para cada caso global.
- Proveer `evidencia/verificar_global.py` para ejecutar y auditar de punta a punta los casos `G-01` a `G-07` contra el servidor en ejecución.

**Non-Goals:**
- Incluir archivos `.env`, credenciales reales o entornos virtuales en el repositorio.
- Alterar la lógica de negocio del frontend o del backend.

## Decisions
1. **Ubicación de `C-07_consultas.txt`**: colocar el reporte en `evidencia/C-07_consultas.txt` en la raíz (como exige el formato de entrega del ZIP en pág. 9 del PDF) y mantener una copia idéntica en `backend/evidencia/C-07_consultas.txt` (ruta por defecto cuando se corre `python -m scripts.evidencia_c07` desde `backend/`).
2. **Evidencia estructurada de `G-01` a `G-07`**: organizar `evidencia/G-01_a_G-07/` con un índice general (`README.md`) y archivos individuales por caso (`G-01_catalogo.md` a `G-07_despliegue.md`) detallando pasos ejecutados, petición HTTP, código de estado, cuerpo JSON devuelto y estado observado en el DOM.
3. **Script de auditoría reproducible**: incluir `evidencia/verificar_global.py` que ejecuta automáticamente los casos `G-01` a `G-07` contra la URL configurada (`http://localhost:8000` o `https://<dominio>/api`) usando únicamente la biblioteca estándar de Python (`urllib.request`), sin requerir dependencias adicionales.

## Risks / Trade-offs
- **[Exposición accidental de secretos]** → Se utilizan exclusivamente datos ficticios del `seed.py` y marcadores `<contraseña_privada>` en toda la documentación y evidencias.
