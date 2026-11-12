# Librería Páginas del Sol — Base de Conocimiento (KB)

Base de conocimiento canónica generada para el proyecto **TPI-Programacion3 (Evaluación Global · Integración y Despliegue)** de la Tecnicatura Universitaria en Programación a Distancia (UTN).

---

## Índice de Archivos

| # | Archivo | Contenido Principal |
|---|---|---|
| 01 | [01_vision_y_objetivos.md](01_vision_y_objetivos.md) | Propósito del sistema, objetivos por actor (librero, devops, evaluador), alcance v1.0, exclusiones y métricas de éxito. |
| 02 | [02_descripcion_general.md](02_descripcion_general.md) | Stack tecnológico completo, arquitectura en 3 capas, diagrama ASCII, integraciones externas y catálogo de endpoints REST. |
| 03 | [03_actores_y_roles.md](03_actores_y_roles.md) | Actores humanos y automatizados, modelo monorrol de terminal única, matriz de permisos RBAC y rutas públicas. |
| 04 | [04_modelo_de_datos.md](04_modelo_de_datos.md) | Dominios (Catálogo, Clientes, Ventas), diagramas ERD (Mermaid y ASCII), diccionario de datos de 9 entidades, índices y seed data. |
| 05 | [05_reglas_de_negocio.md](05_reglas_de_negocio.md) | Reglas codificadas por dominio: catálogo (`RN-LIB`), clientes (`RN-CLI`), ventas (`RN-VEN`), UX (`RN-UI`) y despliegue (`RN-DEP`). |
| 06 | [06_funcionalidades.md](06_funcionalidades.md) | Historias de usuario (US-001 a US-010) organizadas en 5 épicas, mapeadas a los Ejercicios 1 a 5 y casos G-01 a G-07. |
| 07 | [07_flujos_principales.md](07_flujos_principales.md) | Flujos extremo a extremo con diagramas de secuencia: catálogo, alta atómica, venta con bloqueo `FOR UPDATE`, precio congelado y Nginx. |
| 08 | [08_arquitectura_propuesta.md](08_arquitectura_propuesta.md) | Patrones de diseño (Reverse Proxy, Anti-N+1, DTO Forbid, Snapshots), estructura de carpetas, seguridad y variables de entorno. |
| 09 | [09_decisiones_y_supuestos.md](09_decisiones_y_supuestos.md) | Decisiones técnicas documentadas (DD-01 a DD-05: selectores, proxy_pass con barra final, extra="forbid") y supuestos (SU-01 a SU-04). |
| 10 | [10_preguntas_abiertas.md](10_preguntas_abiertas.md) | Inconsistencias detectadas entre el estado heredado (TP1/TP2) y el Global (IN-01 a IN-04) y matriz priorizada de preguntas abiertas. |
| 12 | [12_devops_y_despliegue.md](12_devops_y_despliegue.md) | Guía de despliegue en 5 pasos, plantillas de Dockerfile y Nginx, docker-compose local, configuración en Easypanel y casos G-01 a G-07. |

---

## Quick Start para Desarrolladores y Evaluadores

Para comenzar a trabajar o evaluar el proyecto, se recomienda seguir este itinerario de lectura:

1. **Entender el propósito y alcance**: Leer [01_vision_y_objetivos.md](01_vision_y_objetivos.md) y [03_actores_y_roles.md](03_actores_y_roles.md).
2. **Comprender la base relacional y reglas**: Revisar [04_modelo_de_datos.md](04_modelo_de_datos.md) y [05_reglas_de_negocio.md](05_reglas_de_negocio.md).
3. **Analizar la arquitectura y comunicaciones**: Inspeccionar [02_descripcion_general.md](02_descripcion_general.md) y [08_arquitectura_propuesta.md](08_arquitectura_propuesta.md).
4. **Ver cómo interactúan los componentes**: Estudiar los diagramas de secuencia en [07_flujos_principales.md](07_flujos_principales.md) y las historias en [06_funcionalidades.md](06_funcionalidades.md).
5. **Decisiones clave y resolución de discrepancias**: Consultar [09_decisiones_y_supuestos.md](09_decisiones_y_supuestos.md) y [10_preguntas_abiertas.md](10_preguntas_abiertas.md).
6. **Despliegue y verificación de casos de prueba**: Seguir la guía operativa en [12_devops_y_despliegue.md](12_devops_y_despliegue.md).

---

## Resumen Ejecutivo

**Librería Páginas del Sol** es una solución web integral para la gestión comercial y catalogación editorial, construida sobre un stack moderno y eficiente: frontend nativo en HTML5/CSS3/JavaScript ES6+, reverse proxy Nginx 1.30-alpine, API REST asincrónica en FastAPI (Python 3.12) con SQLModel/SQLAlchemy 2.0 y base de datos relacional PostgreSQL 16.

La solución resuelve de raíz los desafíos clásicos de las aplicaciones desacopladas: elimina la necesidad de CORS unificando el origen en `/api/` mediante Nginx, protege la integridad de los datos mediante bloqueo pesimista (`SELECT ... FOR UPDATE`), previene de forma estricta las consultas N+1 con `lazy="raise"`, y garantiza inmutabilidad contable registrando un snapshot congelado del precio unitario en cada renglón de venta. Todo el sistema está preparado para ser desplegado en la nube mediante tres contenedores Docker coordinados en Easypanel.
