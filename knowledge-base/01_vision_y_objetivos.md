# Visión y Objetivos

## Propósito del sistema

El sistema **Librería Páginas del Sol** tiene como propósito integrar la interfaz web de usuario (desarrollada con HTML5, CSS3 y JavaScript nativo) con una API REST asincrónica construida en FastAPI y una base de datos relacional PostgreSQL 16, mediante un reverse proxy Nginx contenedorizado y desplegado en la plataforma PaaS Easypanel.

Esta solución evoluciona las etapas previas del Trabajo Práctico Integrador de Programación III (donde el backend y el frontend se desarrollaron de forma independiente con simulación local en memoria y `localStorage`) hacia una plataforma web monolítica distribuida, plenamente funcional en la nube, con persistencia transaccional real, integridad referencial estricta, consultas optimizadas sin el problema de N+1, y un registro histórico inmutable de ventas con precios congelados.

## Objetivos por actor

| Actor | Objetivo principal | Objetivos secundarios |
|---|---|---|
| **Operador de Librería / Librero** | Gestionar las operaciones cotidianas de la librería (catálogo, altas y ventas) desde una interfaz web fluida y accesible. | • Consultar el catálogo con búsqueda reactiva por título sin distinción de mayúsculas ni espacios superfluos.<br>• Dar de alta nuevos libros asignando editoriales, géneros y múltiples autores con roles específicos.<br>• Registrar nuevos clientes y consultar sus datos.<br>• Armar y confirmar ventas multirrenglón con control automático de stock.<br>• Consultar el historial de ventas pasadas verificando el precio histórico original. |
| **Administrador de Sistemas / DevOps** | Desplegar, configurar y monitorear la infraestructura contenedorizada en Easypanel de forma reproducible y desacoplada. | • Mantener aislados los contenedores en una red interna privada.<br>• Configurar el reverse proxy Nginx para evitar el uso de CORS y unificar el origen HTTP.<br>• Automatizar la ejecución de migraciones de base de datos con Alembic en cada despliegue.<br>• Supervisar los endpoints de salud (`/health/live` y `/health/ready`). |
| **Evaluador Académico (Cátedra Programación III - UTN)** | Auditar el cumplimiento de los requerimientos técnicos y pedagógicos del TPI Global. | • Verificar la correcta integración frontend-backend a través de Nginx (`/api/`).<br>• Comprobar el cumplimiento de los casos de prueba C-01 a C-08 de backend y G-01 a G-07 de la Evaluación Global.<br>• Validar el congelamiento de precios históricos en ventas tras modificaciones de precio en el catálogo (`PATCH /libros/{id}`).<br>• Constatar la preservación de borradores en el frontend ante errores 409 o 422. |

## Alcance v1.0 (Evaluación Global · Integración y Despliegue)

El sistema comprende las siguientes capacidades operativas y de infraestructura:

- **Interfaz de usuario web nativa**: Catálogo editorial, altas de libros y clientes, confección de ventas y consulta de historial, estructurados en una SPA ligera basada en navegación por secciones (`#catalogo`, `#libros`, `#clientes`, `#ventas`, `#historial`) sin frameworks ni dependencias externas.
- **Reverse Proxy Nginx integrado**: Servidor web Nginx 1.30-alpine que sirve el frontend estático y redirige todas las peticiones con prefijo `/api/` hacia el servicio upstream de FastAPI, suprimiendo la necesidad de habilitar CORS en la API.
- **Catálogo editorial interactivo**: Listado paginado de libros con filtro en tiempo real por título (insensible a mayúsculas/minúsculas vía `ILIKE` en PostgreSQL). Cada libro presenta editorial, género (o la etiqueta `"Sin clasificar"` cuando es nulo) y autores con sus respectivos roles y orden.
- **Formularios de alta transaccionales**:
  - Alta de libros con validación de ISBN único, precio positivo, stock no negativo, editorial obligatoria y asociación a uno o más autores existentes con roles definidos (`autor`, `coautor`, `traductor`, `ilustrador`) en una sola transacción.
  - Alta de clientes con nombre completo y validación de email único normalizado a minúsculas.
  - Sincronización automática de selectores en la sección de ventas tras cada alta confirmada.
- **Módulo transaccional de ventas**:
  - Preparación de ventas con selección de cliente y múltiples libros con cantidades enteras positivas.
  - Confirmación contra la API (`POST /ventas/`), delegando el cálculo de importes y totales al servidor y prohibiendo datos extra (`extra="forbid"`).
  - Bloqueo pesimista de libros (`SELECT ... FOR UPDATE`), descuento atómico de stock y copia inmutable del precio unitario en el renglón.
  - Simulación asincrónica de notificación de comprobante por correo en segundo plano (`BackgroundTasks`).
- **Historial de ventas y precios congelados**:
  - Consulta de ventas históricas y detalle individual con renglones, subtotales y totales.
  - Comprobación pedagógica de inmutabilidad: el precio registrado en una venta permanece inalterado incluso si posteriormente se modifica el precio del libro en el catálogo mediante `PATCH /libros/{id}`.
- **Despliegue contenedorizado en Easypanel**:
  - Tres servicios orquestados: base de datos PostgreSQL 16 con volumen persistente, backend FastAPI con Python 3.12 y frontend Nginx.
  - Variables de entorno parametrizadas (`DATABASE_URL`, `API_UPSTREAM`, `NGINX_ENVSUBST_FILTER`).

## Fuera de alcance

Las siguientes características quedan explícitamente excluidas del alcance de esta versión:

- **Autenticación y autorización multiusuario**: No se implementa sistema de login, registro de usuarios, sesiones con cookies ni tokens JWT. El sistema opera como una terminal de punto de venta / operador único de librería.
- **Pasarelas de cobro electrónico reales**: No se integra procesamiento de pagos con MercadoPago, Stripe u otras entidades bancarias; la venta se confirma directamente a nivel de base de datos.
- **Modificación o eliminación de ventas**: Por reglas de negocio y auditoría contable, no se exponen endpoints `PATCH` ni `DELETE` para ventas registradas (`RN-VEN-07` / `RN-08`).
- **Eliminación en cascada de entidades principales**: No se permite borrar editoriales, autores o libros que cuenten con referencias en ventas o autorías (`ON DELETE RESTRICT`).
- **Frameworks de frontend pesados o empaquetadores**: No se utiliza React, Vue, Angular, Node.js en producción, Webpack ni Vite para el frontend; se mantiene estrictamente HTML, CSS y JavaScript nativo ES6+.

## Métricas de éxito

1. **Cero errores de CORS**: Todas las llamadas entre el navegador y la API se realizan a través del mismo origen provisto por Nginx (`/api/`), eliminando bloqueos de políticas de mismo origen.
2. **Aprobación de la suite de pruebas completa**:
   - 100% de los casos C-01 a C-08 de backend aprobados en el entorno desplegado.
   - 100% de los casos G-01 a G-07 de la Evaluación Global verificados y documentados en `evidencia/`.
3. **Eficiencia en consultas SQL (Sin N+1)**: Las consultas de detalle de libro y de venta se resuelven en exactamente 2 consultas SQL gracias a la configuración de `joinedload` y `selectinload` con `lazy="raise"`.
4. **Resiliencia de UX en el frontend**: Los borradores de formularios de altas y ventas se conservan intactos en memoria ante respuestas de error 409 o 422, permitiendo la corrección sin pérdida de información.
5. **Inmutabilidad demostrada**: El subtotal y total de ventas históricas no presentan ninguna variación tras ejecutar cambios de precio en el catálogo.
