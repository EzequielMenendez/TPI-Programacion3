# TPI-Programacion3 (Librería Páginas del Sol) — Instrucciones para Agentes

> Este archivo (y su copia `CLAUDE.md`) es lo PRIMERO que todo agente lee al entrar al repo.
> Generado a partir de `knowledge-base/` y `CHANGES.md`. No editar a mano sin re-sincronizar ambos archivos.

---

## Stack Tecnológico

| Capa | Tecnologías | Versión mínima / Variante | Rol en la solución |
|------|-------------|---------------------------|--------------------|
| **Frontend Web** | HTML5 semántico, CSS3 nativo, JavaScript nativo (ES6+) | Navegadores modernos (Chromium 120+, Firefox 120+, Safari 17+) | SPA ligera sin dependencias externas. Consume `/api/` mediante `fetch` asincrónico, renderiza dinámicamente y manipula el DOM con `textContent` y validaciones accesibles. |
| **Reverse Proxy / Servidor Web** | Nginx | 1.30-alpine | Punto de entrada público. Sirve archivos estáticos (`frontend/public/`) y rutea `/api/` hacia el contenedor backend upstream sin CORS (`proxy_pass http://${API_UPSTREAM}/;`). |
| **Backend REST API** | Python, FastAPI, Uvicorn, SQLModel / Pydantic v2 | Python 3.12, FastAPI 0.115+ | API RESTful asincrónica. Define modelos, esquemas DTO con validación estricta, servicios de negocio, manejo de transacciones y tareas en segundo plano. |
| **ORM / Acceso a Datos** | SQLAlchemy 2.0 (modo asincrónico), Alembic, asyncpg | SQLAlchemy 2.0+, Alembic 1.13+, asyncpg 0.29+ | Mapeo objeto-relacional asincrónico, pool de conexiones, carga declarativa de relaciones (`joinedload`, `selectinload`), control de consultas N+1 con `lazy="raise"` y migraciones de esquema. |
| **Base de Datos** | PostgreSQL | 16.x-alpine | Base de datos relacional transaccional (ACID). Garantiza restricciones de unicidad, chequeos numéricos y claves foráneas con índices dedicados. |
| **Contenedores y Despliegue** | Docker, Docker Compose, Easypanel | Docker 24+, Compose v2 | Contenedorización multi-servicio, prueba local integrada y despliegue en la plataforma PaaS Easypanel sobre VPS Linux. |

Detalle completo: [knowledge-base/02_descripcion_general.md](knowledge-base/02_descripcion_general.md)

---

## Base de Conocimiento

La fuente de verdad del dominio vive en `knowledge-base/`. **Leé el archivo relevante ANTES de implementar.**

| Archivo | Cuándo leerlo |
|---------|---------------|
| [01_vision_y_objetivos.md](knowledge-base/01_vision_y_objetivos.md) | Entender propósito, alcance del Global y criterios de evaluación |
| [02_descripcion_general.md](knowledge-base/02_descripcion_general.md) | Stack tecnológico, arquitectura de 3 capas y catálogo de endpoints REST |
| [03_actores_y_roles.md](knowledge-base/03_actores_y_roles.md) | Actores, permisos CRUD por recurso y rutas públicas |
| [04_modelo_de_datos.md](knowledge-base/04_modelo_de_datos.md) | Entidades, ERD, constraints y seed data inicial |
| [05_reglas_de_negocio.md](knowledge-base/05_reglas_de_negocio.md) | Reglas codificadas (`RN-LIB`, `RN-CLI`, `RN-VEN`, `RN-UI`, `RN-DEP`) |
| [06_funcionalidades.md](knowledge-base/06_funcionalidades.md) | Historias de usuario (`US-001` a `US-010`) mapeadas a Ejercicios 1–5 y Casos G-01–G-07 |
| [07_flujos_principales.md](knowledge-base/07_flujos_principales.md) | Flujos E2E (catálogo, altas, ventas, inmutabilidad histórica de precios, proxy Nginx) |
| [08_arquitectura_propuesta.md](knowledge-base/08_arquitectura_propuesta.md) | Patrones, estructura con `frontend/public/`, Dockerfiles y variables de entorno |
| [09_decisiones_y_supuestos.md](knowledge-base/09_decisiones_y_supuestos.md) | Decisiones documentadas (`DD-01` selectores por listado + verificación por ID, `DD-02` `proxy_pass`) |
| [10_preguntas_abiertas.md](knowledge-base/10_preguntas_abiertas.md) | ⚠️ Inconsistencias heredadas (`IN-01` a `IN-04`) a resolver durante los changes |
| [12_devops_y_despliegue.md](knowledge-base/12_devops_y_despliegue.md) | Guía de los 5 pasos de Docker/Easypanel, `DEPLOY.md` y casos `G-01` a `G-07` |

> ⚠️ Revisar las inconsistencias documentadas en `10_preguntas_abiertas.md` (`IN-01` a `IN-04`) antes de implementar cada change.

---

## Skills Disponibles

| Agente | Rol | Skills que carga |
|--------|-----|------------------|
| **Frontend & UI** | HTML5 / CSS3 / JS Nativo (`fetch`, DOM, estados UI) | `emil-design-eng`, `design-taste-frontend-v1`, `design-system` |
| **Orquestación & SDD** | Fundación, KB, Roadmap, Reglas y Skills | `active-orchestrator`, `kb-creator`, `roadmap-generator`, `agents-md-generator`, `find-skills`, `skill-creator` |
| **Investigación** | Discovery y análisis externo | `discovery-research`, `web-scraper` |

Cargá la skill correspondiente al contexto ANTES de escribir código.

> Los compact rules de cada skill los resuelve el orquestador desde `.atl/skill-registry.md` (generado por `skill-registry`; no versionado — no está en el repo). Esta tabla solo mapea skill→rol.

---

## Roadmap de Changes

El plan de implementación completo está en [CHANGES.md](CHANGES.md). Resumen:

- **Total**: 6 changes en 5 fases.
- **Camino crítico** (4): `C-01 → C-02 → C-03 → C-06` (con rama paralela de contenedorización `C-01 → C-04 → C-05 → C-06`).
- **Primer change**: `C-01` (`frontend-api-client-catalog`).

**Antes de cualquier `/opsx:propose`**: leé [CHANGES.md](CHANGES.md), identificá las dependencias del change y los archivos de "Leer antes".

---

## Reglas Duras

> Reglas **globales** ya definidas en el entorno del agente (orquestador OPSX, governance por dominio, Strict TDD Mode, protocolo Engram): el proyecto las **hereda**, no se repiten acá.

Acá viven las reglas **específicas de este proyecto** derivadas de su stack y de la consigna del Global de Programación III, más las reglas universales de control de repositorio confirmadas con el usuario. Son contrato; romperlas es un defecto:

1. **Rutas y Cliente HTTP (`fetch`)**: `NUNCA` hardcodear `http://localhost:8000` ni omitir la barra final en rutas de colección → centralizar todas las peticiones en `frontend/public/js/` con prefijo `/api` y conservar la barra final donde la guía la exige (`/api/libros/`, `/api/editoriales/`, `/api/generos/`, `/api/autores/`, `/api/clientes/`, `/api/ventas/`).
2. **Persistencia y Estado en Frontend**: `NUNCA` persistir altas ni ventas en `localStorage` o arrays en memoria como fuente de verdad → todos los registros e importes confirmados provienen de la API y se guardan en PostgreSQL; el frontend solo puede mantener en memoria el borrador de la venta en curso (conservándolo cuando la API rechaza con `409` o `422` y limpiándolo tras recibir `201`).
3. **Seguridad DOM y Datos Ficticios**: `NUNCA` inyectar datos provenientes de la API con `innerHTML` sin escapar ni usar datos personales o credenciales reales en seeds, pruebas o evidencias → renderizar datos dinámicos con `textContent` / creación segura de nodos DOM y usar exclusivamente datos ficticios y archivos `.env` excluidos de Git.
4. **Contratos Backend e Inmutabilidad de Ventas**: `NUNCA` confiar en precios o totales enviados por el cliente ni romper la arquitectura `Router -> Service -> Model` en `backend/` → mantener `extra="forbid"` en los payloads de entrada (`VentaCreate`), congelar `precio_unitario` desde el catálogo al registrar la venta y preservar intactos los importes históricos ante `PATCH /libros/{id}`.
5. **Estructura Docker y Proxy Nginx**: `NUNCA` dejar archivos requeridos fuera de su contexto de build ni quitar la barra final de `proxy_pass` → separar los archivos públicos en `frontend/public/` servidos por `nginx:1.30-alpine` (`NGINX_ENVSUBST_FILTER=^API_UPSTREAM$` y `proxy_pass http://${API_UPSTREAM}/;` en `frontend/default.conf.template`) y mantener `backend/` autocontenido (`Dockerfile`, `.dockerignore`, `requirements.txt`, `alembic.ini`, `migrations/`, `env.example`) para el Build Path `/backend` de Easypanel.
6. **Control de Commits y Builds**: `NUNCA` ejecutar `git commit`, `git push` ni agregar líneas de co-autoría de IA sin pedido explícito del usuario → esperar instrucción explícita antes de commitear o pushear.

---

## Flujo de Trabajo

```
1. Leer la KB relevante (knowledge-base/)        → entender el dominio y las reglas RN-*
2. Identificar el change en CHANGES.md           → respetar dependencias y "Leer antes"
3. /opsx:propose C-NN-nombre                     → proposal + design + specs + tasks
4. Implementar las tasks (Strict TDD Mode)       → respetando las reglas duras
5. /opsx:archive C-NN-nombre + marcar [x]        → sincronizar specs y cerrar el change
```

Aplicar TODAS las reglas duras en cada paso. Ante conflicto entre la KB y este archivo, las reglas duras prevalecen.
