# deployment-docs-evidence Specification

## Purpose
Consolidar la documentación de entrega (`README.md`, `DEPLOY.md`) y la evidencia verificable (`evidencia/`) para los casos de prueba de la Evaluación Global de Programación III.

## Requirements

### Requirement: Documentación de ejecución local y despliegue
El repositorio MUST incluir en su raíz los archivos `README.md` y `DEPLOY.md` identificando al grupo, los pasos para ejecutar la aplicación localmente, la carga de datos de prueba y la configuración de servicios en Easypanel.

#### Scenario: Consulta de instrucciones por el evaluador
- **WHEN** un evaluador abre `README.md` y `DEPLOY.md`
- **THEN** encuentra los integrantes, la opción elegida para los selectores, los comandos de migración y semilla, las rutas de build (`/frontend` y `/backend`), los puertos y el proxy de `/api/`

### Requirement: Evidencia de consultas sin N+1 (Caso C-07)
La carpeta `evidencia/` MUST incluir `C-07_consultas.txt` con las sentencias SQL reales emitidas al consultar el detalle de un libro y de una venta, demostrando un número constante de 2 consultas.

#### Scenario: Verificación de C-07
- **WHEN** se consulta `evidencia/C-07_consultas.txt`
- **THEN** se observan exactamente 2 consultas para `GET /libros/1` (1 autor), 2 para `GET /libros/5` (3 autores), 2 para `GET /ventas/1` (1 renglón) y 2 para `GET /ventas/2` (2 renglones)

### Requirement: Evidencia y protocolo reproducible de los casos G-01 a G-07
La carpeta `evidencia/` MUST documentar y respaldar los pasos, peticiones y resultados observados para los casos `G-01` a `G-07` con datos ficticios y sin exponer credenciales reales.

#### Scenario: Auditoría de casos globales
- **WHEN** se revisa `evidencia/` o se ejecuta el verificador de casos globales
- **THEN** quedan comprobados los casos G-01 (Catálogo), G-02 (Alta de libro y 409), G-03 (Alta de cliente, consulta por ID y 409), G-04 (Venta multirrenglón y persistencia), G-05 (Precio histórico tras PATCH), G-06 (Rechazo 409 y 422) y G-07 (Salud y despliegue)
