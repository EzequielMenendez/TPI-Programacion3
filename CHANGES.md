# CHANGES — Secuencia de Implementación

> Índice canónico de todos los changes del proyecto **Librería Páginas del Sol**.
> Cada change es atómico: un agente puede implementarlo en una sesión (~4-6 horas).
> **Leer este archivo antes de ejecutar cualquier `/opsx:propose`.**

---

## Cómo usar este documento

1. Identificar el change a implementar (verificar que sus dependencias estén completas o en `openspec/changes/archive/`).
2. Leer los documentos de la knowledge-base indicados en la sección "Leer antes" del change.
3. Ejecutar `/opsx:propose <nombre-del-change>`.
4. Al terminar el change y validar sus criterios de aceptación, archivarlo con `/opsx:archive <nombre-del-change>`.
5. Marcar el checkbox `[x]` correspondiente en este archivo.

---

## Árbol de dependencias

```
C-01 frontend-api-client-catalog
  │
  ├── C-02 frontend-altas-integration
  │     └── C-03 frontend-ventas-historial ──────────┐
  │                                                   │
  └── C-04 frontend-docker-nginx                      │
        └── C-05 backend-docker-compose               │
              └───────────────────────────────────────┴──► C-06 deployment-docs-evidence
```

### Paralelismo por fase

> Cada "gate" representa un punto de sincronización. Los changes dentro de un gate pueden ejecutarse en paralelo.

```
GATE 0: ninguna
  → C-01 frontend-api-client-catalog   [Agente A]

GATE 1: C-01 ✓                         ← PRIMER FORK (2 ramas paralelas)
  → C-02 frontend-altas-integration    [Agente A]
  → C-04 frontend-docker-nginx         [Agente B]

GATE 2: C-02 ✓ y C-04 ✓
  → C-03 frontend-ventas-historial     [Agente A — si C-02 ✓]
  → C-05 backend-docker-compose        [Agente B — si C-04 ✓]

GATE 3: C-03 + C-05 ✓                  ← JOIN (convergencia final)
  → C-06 deployment-docs-evidence      [Agente C]
```

### Camino crítico (4 changes — mínimo irreducible)

```
C-01 → C-02 → C-03 → C-06
```

*(Nota: la rama de infraestructura C-01 → C-04 → C-05 corre en paralelo y converge en C-06 para la verificación y entrega final).*

### Plan óptimo con 3 agentes

```
Paso │ Agente A (Frontend Core)         │ Agente B (DevOps / Docker)       │ Agente C (Testing / Docs)
─────┼──────────────────────────────────┼──────────────────────────────────┼──────────────────────────
  1  │ C-01 frontend-api-client-catalog │                —                 │            —
  2  │ C-02 frontend-altas-integration  │ C-04 frontend-docker-nginx       │            —
  3  │ C-03 frontend-ventas-historial   │ C-05 backend-docker-compose      │            —
  4  │                —                 │                —                 │ C-06 deployment-docs-evidence
```

---

## FASE 1 — Cliente HTTP, Estructura y Catálogo (Ejercicio 1)

### [C-01] `frontend-api-client-catalog`
- **Estado**: `[x]` completado (`openspec/changes/archive/2026-11-13-frontend-api-client-catalog/`)
- **Scope**: Reorganización del frontend nativo, cliente HTTP centralizado e integración reactiva del catálogo editorial y detalle de obras (Ejercicio 1 · Caso G-01)
  - Estructuración limpia de recursos estáticos en `frontend/` (`index.html`, `css/styles.css`, `js/`), erradicando la dependencia de `localStorage` para lecturas de catálogo.
  - Implementación de `frontend/js/api.js`: cliente `apiFetch(path, options)` centralizado con prefijo `/api/`, barra final obligatoria en rutas de colección (`/api/libros/`, `/api/editoriales/`, etc., cumpliendo `RN-DEP-01` y evitando redirecciones 307 de FastAPI), parseo homogéneo de JSON y mapeo de errores HTTP (400, 404, 409, 422, 500).
  - Adaptación de `frontend/js/catalogo.js`: consumo asincrónico de `GET /api/libros/?limit=20&offset=0`. Renderizado dinámico de tarjetas de libros mediante `textContent` contra inyecciones XSS. Inserción obligatoria de la etiqueta `"Sin clasificar"` cuando `genero` es `null` (`RN-LIB-05`). Formateo de precio en moneda nacional ARS (`$ 0,00`).
  - Búsqueda en tiempo real por título (Caso G-01): envío de `GET /api/libros/?titulo={texto}` con `trim()`, insensible a mayúsculas/minúsculas vía `ILIKE` en PostgreSQL (`RN-LIB-08`), mensaje accesible ante búsquedas sin coincidencias y botón "Mostrar todo el catálogo" para restaurar el listado completo.
  - Detalle y autores de libro: consumo de `GET /api/libros/{id}` (`LibroDetalle`) para desplegar en tarjeta o vista la lista completa de autores con sus roles (`autor`, `coautor`, `traductor`, `ilustrador`) y orden de aparición (`IN-03`, `RN-LIB-06`).
  - Tests: pruebas funcionales de carga de catálogo, búsqueda insensible y renderizado seguro del DOM.
- **Dependencias**: ninguna
- **Governance**: MEDIO
- **Leer antes**:
  - `knowledge-base/01_vision_y_objetivos.md` §Alcance v1.0
  - `knowledge-base/02_descripcion_general.md` §API REST (Módulo Libros)
  - `knowledge-base/05_reglas_de_negocio.md` §Dominio: Catálogo y Libros (RN-LIB-02, RN-LIB-05, RN-LIB-08)
  - `knowledge-base/06_funcionalidades.md` §Épica 1: Catálogo Editorial y Búsqueda (US-001, US-002)
  - `knowledge-base/07_flujos_principales.md` §Flujo 1: Consulta y Búsqueda en el Catálogo Editorial

---

## FASE 2 — Persistencia de Altas y Sincronización de Selectores (Ejercicio 2)

### [C-02] `frontend-altas-integration`
- **Estado**: `[ ]` pendiente
- **Scope**: Integración de formularios de alta de libros y clientes con persistencia relacional en base de datos, carga dinámica de selectores y preservación de borradores ante conflicto (Ejercicio 2 · Casos G-02, G-03, G-04)
  - Carga reactiva de selectores en `frontend/js/libros.js`: consumo de `GET /api/editoriales/`, `GET /api/generos/` y `GET /api/autores/` al montar la vista de altas para poblar `<select>` y casillas de autores (`DD-01`), con soporte para verificación individual con `GET /api/autores/{id}` y `GET /api/clientes/{id}`.
  - Formulario `#form-libro` y alta atómica (Caso G-02): despacho de `POST /api/libros/` con payload estructurado `LibroCreate` (`titulo`, `isbn`, `precio`, `stock`, `editorial_id`, `genero_id` opcional, y array `autores: [{autor_id, rol, orden}]` resolviendo `IN-02` y `RN-LIB-06`).
  - Tratamiento de éxito (201 Created): vaciado completo del formulario (`RN-UI-02`), despliegue de alerta accesible (`role="status"`) con ID y título del nuevo libro, actualización inmediata de la tabla de libros y del catálogo.
  - Rechazo de ISBN duplicado y conservación de borrador (Caso G-03): captura de HTTP 409 Conflict (`"Ya existe un libro con ese ISBN."`), visualización de alerta de error (`role="alert"`) y **preservación estricta de todos los campos ingresados en pantalla (`RN-UI-01`, `DD-05`)** para permitir la corrección del ISBN sin reingresar datos.
  - Formulario `#form-cliente` y alta de clientes (Caso G-04): validación de nombre y email normalizado a minúsculas (`RN-CLI-01`). Despacho de `POST /api/clientes/`. Ante 201 Created: vaciado del formulario y refresco de la tabla de clientes. Ante 409 Conflict (email duplicado): **conservación del borrador en pantalla (`RN-UI-01`)** y mensaje de error amigable.
  - Sincronización en caliente (`RN-UI-04`): mecanismo reactivo que notifica a la sección `#ventas` tras cada alta exitosa (libro o cliente), actualizando sus selectores dinámicamente sin recargar la página ni perder borradores de venta en curso.
  - Tests: validación de formularios, intercepción de submit con `event.preventDefault()`, y verificación de preservación de inputs ante 409 y 422.
- **Dependencias**: C-01
- **Governance**: MEDIO
- **Leer antes**:
  - `knowledge-base/04_modelo_de_datos.md` §Dominio Catálogo y Dominio Clientes
  - `knowledge-base/05_reglas_de_negocio.md` §Dominio: Experiencia de Usuario y Frontend (RN-UI-01, RN-UI-02, RN-UI-04)
  - `knowledge-base/06_funcionalidades.md` §Épica 2: Gestión de Altas con Persistencia Real (US-003, US-004, US-005)
  - `knowledge-base/07_flujos_principales.md` §Flujo 2: Alta Atómica de Libro con Autorías Múltiples
  - `knowledge-base/09_decisiones_y_supuestos.md` §DD-01 (Carga de Selectores) y DD-05 (Preservación de Borradores)

---

## FASE 3 — Ventas Transaccionales, Historial y Precios Inmutables (Ejercicio 3)

### [C-03] `frontend-ventas-historial`
- **Estado**: `[x]` completado (`openspec/changes/archive/2026-11-13-frontend-ventas-historial/`)
- **Scope**: Confección transaccional de ventas multirrenglón, control de stock, preservación de borradores ante conflicto, consulta de historial y auditoría de precios históricos congelados (Ejercicio 3 · Casos G-05, G-06, G-07)
  - Adaptación de `frontend/js/ventas-modelo.js` y `frontend/js/ventas.js` a las entidades de la API con IDs enteros (`cliente_id: int`, `libro_id: int`, resolviendo `IN-01`). Poblado dinámico de selectores de clientes y libros desde la API.
  - Armado de borrador multirrenglón: adición de libros con cantidades enteras (`cantidad >= 1`), validación estricta de libro único por venta (`RN-VEN-02`), modificación interactiva de cantidades y eliminación de renglones antes de confirmar.
  - Confirmación de venta (Caso G-05): despacho de `POST /api/ventas/` con payload mínimo `{ cliente_id, renglones: [{ libro_id, cantidad }] }`, prohibiendo terminantemente el envío de precios o totales (`extra="forbid"`, `DD-03`, `RN-VEN-03`).
  - Tratamiento de confirmación (201 Created): limpieza integral del borrador de venta (`RN-UI-02`), notificación de confirmación con ID de venta y total calculado por el servidor, y actualización reactiva de stock en las vistas de catálogo y altas.
  - Manejo de stock insuficiente y rechazos (Caso G-07): captura de HTTP 409 Conflict (restricción `ck_libro_stock_no_negativo` o cliente inexistente) y errores 422, **preservando intacto todo el borrador de venta en pantalla (`RN-UI-01`)** para permitir al librero corregir la cantidad del renglón afectado.
  - Consulta de Historial de Ventas: sección `#historial` consumiendo `GET /api/ventas/?limit=20&offset=0`, renderizando tabla con ID de venta, fecha/hora formateada, nombre de cliente y total.
  - Detalle de venta: botón "Ver detalle" consumiendo `GET /api/ventas/{id}` (`VentaDetalle`) desplegando cabecera y tabla de renglones con título, cantidad, precio unitario histórico y subtotales.
  - Demostración pedagógica de precio histórico congelado (Caso G-06): procedimiento de prueba y verificación donde tras confirmar una venta con un libro y luego alterar su precio de catálogo mediante `PATCH /api/libros/{id}`, la venta histórica en `#historial` conserva de forma inmutable el precio unitario y total originales (`RN-VEN-04`, `RN-VEN-07`).
  - Tests: pruebas de confirmación de venta, captura de errores de stock y verificación de inmutabilidad de precios históricos.
- **Dependencias**: C-02
- **Governance**: ALTO
- **Leer antes**:
  - `knowledge-base/04_modelo_de_datos.md` §Dominio Ventas (Venta, RenglonVenta)
  - `knowledge-base/05_reglas_de_negocio.md` §Dominio: Ventas (RN-VEN-01 a RN-VEN-08)
  - `knowledge-base/06_funcionalidades.md` §Épica 3 y Épica 4 (US-006, US-007, US-008, US-009)
  - `knowledge-base/07_flujos_principales.md` §Flujo 3: Registro Transaccional de Venta y Congelamiento de Precios
  - `knowledge-base/09_decisiones_y_supuestos.md` §DD-03 (Inmutabilidad de Entrada de Precios y extra="forbid")

---

## FASE 4 — Contenedorización Multi-servicio y Reverse Proxy (Ejercicios 4 y 5)

> Los changes C-04 y C-05 pueden formularse y desarrollarse en paralelo respetando sus respectivos contextos.

### [C-04] `frontend-docker-nginx`
- **Estado**: `[ ]` pendiente
- **Scope**: Dockerización del frontend con Nginx 1.30-alpine, plantilla de sustitución de entorno y reverse proxy unificado sin CORS (Ejercicio 4)
  - Creación de `frontend/Dockerfile`: imagen oficial `nginx:1.30-alpine`, copia de archivos estáticos (`index.html`, `css/`, `js/`) al directorio `/usr/share/nginx/html/`, copia de la plantilla `default.conf.template` al directorio `/etc/nginx/templates/`, exposición del puerto 80 y comando `nginx -g 'daemon off;'`.
  - Creación de `frontend/default.conf.template`: configuración de servidor escuchando en `:80`, bloque `location /` con `try_files $uri $uri/ /index.html;`, y bloque `location /api/` con directiva `proxy_pass http://${API_UPSTREAM}/;` (barra final obligatoria para sustitución de prefijo `DD-02` y cumplimiento de `RN-DEP-02`), configurando cabeceras `Host`, `X-Real-IP`, `X-Forwarded-For` y `X-Forwarded-Proto`.
  - Creación de `frontend/.dockerignore`: exclusión de `tests/`, `.git/`, `.DS_Store` y documentación innecesaria.
  - Parametrización de entorno: configuración de `NGINX_ENVSUBST_FILTER=^API_UPSTREAM$` para asegurar que `envsubst` no altere variables internas de Nginx (`$host`, `$scheme`).
  - Verificación: validación de build de imagen y comprobación de serving estático y proxying local sin errores de CORS (`RN-DEP-03`).
- **Dependencias**: C-01
- **Governance**: MEDIO
- **Leer antes**:
  - `knowledge-base/02_descripcion_general.md` §Arquitectura general y Reverse Proxy Nginx
  - `knowledge-base/05_reglas_de_negocio.md` §Dominio: Red, Integración y Reverse Proxy (RN-DEP-01, RN-DEP-02, RN-DEP-03)
  - `knowledge-base/08_arquitectura_propuesta.md` §Patrones aplicados (Reverse Proxy) y Estructura de directorios
  - `knowledge-base/09_decisiones_y_supuestos.md` §DD-02 (Barra Final en proxy_pass)
  - `knowledge-base/12_devops_y_despliegue.md` §Paso 1 (Dockerfile Frontend) y Paso 2 (Plantilla Nginx)

---

### [C-05] `backend-docker-compose`
- **Estado**: `[ ]` pendiente
- **Scope**: Dockerización del backend FastAPI en Python 3.12 con migraciones automáticas en arranque y orquestación multi-contenedor local con Docker Compose (Ejercicio 5)
  - Creación de `backend/Dockerfile`: imagen `python:3.12-slim`, instalación de `curl` para healthchecks, copia de `requirements.txt` e instalación con `pip --no-cache-dir`, copia de paquetes `app/`, `migrations/`, `scripts/` y `alembic.ini`, exposición del puerto 8000.
  - Automatización de migraciones en inicio (`IN-04`): configuración de comando de arranque `CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]` para garantizar idempotencia del esquema de base de datos antes de recibir tráfico HTTP.
  - Fijación de dependencias en `backend/requirements.txt`: versiones compatibles de `fastapi>=0.115.0`, `uvicorn[standard]>=0.30.0`, `sqlmodel>=0.0.21`, `alembic>=1.13.0`, `asyncpg>=0.29.0` y `pydantic-settings>=2.0.0`.
  - Creación de `backend/env.example` y `backend/.dockerignore`: exclusión de entornos virtuales `.venv`, cachés `__pycache__` y archivos de pruebas locales.
  - Creación de `docker-compose.yml` en la raíz del proyecto para orquestación de 3 servicios:
    - `db`: imagen `postgres:16-alpine`, variables `POSTGRES_DB=libreria`, `POSTGRES_USER=libreria_user`, `POSTGRES_PASSWORD=libreria_password`, volumen persistente `pgdata:/var/lib/postgresql/data`, puerto expuesto `5432:5432` y healthcheck con `pg_isready`.
    - `backend`: build con contexto `./backend`, variable `DATABASE_URL=postgresql+asyncpg://libreria_user:libreria_password@db:5432/libreria`, dependencia `depends_on: { db: { condition: service_healthy } }`, puerto `8000:8000`.
    - `frontend`: build con contexto `./frontend`, variables `API_UPSTREAM=backend:8000` y `NGINX_ENVSUBST_FILTER=^API_UPSTREAM$`, dependencia `depends_on: [backend]`, puerto `80:80`.
  - Verificación: ejecución de `docker compose up --build` validando conectividad interna, endpoints `/health/live` y `/health/ready` (código 200), y ejecución exitosa de `python -m scripts.seed`.
- **Dependencias**: C-04
- **Governance**: ALTO
- **Leer antes**:
  - `knowledge-base/02_descripcion_general.md` §Stack tecnológico
  - `knowledge-base/08_arquitectura_propuesta.md` §Estructura de directorios y Variables de entorno
  - `knowledge-base/10_preguntas_abiertas.md` §IN-04 (Automatización de Migraciones de Alembic)
  - `knowledge-base/12_devops_y_despliegue.md` §Paso 3 (Docker Compose Local), Paso 4 (Dockerfile Backend) y Paso 5 (Easypanel)

---

## FASE 5 — Despliegue en la Nube, Evidencias y Documentación (Ejercicio 5 & Entrega)

### [C-06] `deployment-docs-evidence`
- **Estado**: `[ ]` pendiente
- **Scope**: Documentación completa del proyecto, guía operativa de despliegue en Easypanel, y compilación de la suite de evidencias para los casos G-01 a G-07 (Ejercicio 5 & Entrega)
  - Actualización del archivo `README.md` en la raíz del proyecto: visión general del sistema, arquitectura en 3 capas, guía de inicio rápido con Docker Compose (`docker compose up --build`), configuración de variables de entorno no sensibles, y enlaces de navegación hacia la base de conocimiento y documentación técnica.
  - Creación de `DEPLOY.md`: guía paso a paso para la cátedra y evaluadores detallando la configuración de los 3 servicios en Easypanel (PostgreSQL con volumen `/var/lib/postgresql/data`, Backend con path de build `/backend` y Frontend con path `/frontend`), URL pública activa en Easypanel con certificado SSL/TLS, credenciales ficticias de prueba, variables de entorno inyectadas e instrucciones de prueba sin CORS.
  - Creación y estructuración de la carpeta `evidencia/`:
    - `evidencia/C-07_consultas.txt`: reporte de ejecución de `backend/scripts/evidencia_c07.py` evidenciando que las consultas de detalle de libro y venta se resuelven en exactamente 2 sentencias SQL con `lazy="raise"` sin consultas N+1.
    - `evidencia/G-01_a_G-07/`: capturas de pantalla organizadas y documentadas respaldando el cumplimiento exhaustivo de cada caso de prueba en el entorno desplegado:
      - `G-01`: Carga de catálogo desde `GET /api/libros/` y búsqueda insensible `"RAYU"` mostrando *Rayuela*.
      - `G-02`: Alta de libro válida con respuesta 201 Created, formulario limpio y registro en catálogo.
      - `G-03`: Rechazo de ISBN duplicado con 409 Conflict y conservación de todos los campos del borrador en pantalla.
      - `G-04`: Rechazo de email duplicado con 409 Conflict y preservación del nombre del cliente en el input.
      - `G-05`: Confirmación de venta multirrenglón con total calculado por el servidor, descuento de stock y simulación de comprobante en log.
      - `G-06`: Inmutabilidad demostrada: modificación de precio en catálogo vía `PATCH /libros/{id}` y detalle de venta histórica conservando el precio congelado original.
      - `G-07`: Rechazo por stock insuficiente con 409 Conflict y preservación del borrador de venta intacto.
  - Scripts de prueba o colección de endpoints verificados para auditoría rápida por parte de los docentes.
- **Dependencias**: C-03, C-05
- **Governance**: BAJO
- **Leer antes**:
  - `knowledge-base/01_vision_y_objetivos.md` §Métricas de éxito
  - `knowledge-base/06_funcionalidades.md` §US-001 a US-010 (Criterios de Aceptación)
  - `knowledge-base/12_devops_y_despliegue.md` §Casos de Prueba G-01 a G-07 y Documentación de Entrega
  - `knowledge-base/README.md` §Quick Start para Desarrolladores y Evaluadores
