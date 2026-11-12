# Preguntas Abiertas

## Inconsistencias detectadas

Durante el análisis del repositorio actual (fruto de los TP anteriores: backend FastAPI independiente y frontend nativo en `localStorage`), se identificaron las siguientes discrepancias respecto al objetivo de la Evaluación Global y su resolución propuesta:

---

### IN-01 — Formato de Identificadores y Persistencia (localStorage vs API REST)

- **Documento / Estado previo (TP2 Frontend)**:
  El frontend de la librería generaba identificadores alfanuméricos locales con prefijo (`LI-1`, `CL-1`, `VE-1`), persistiendo las colecciones completas en una única clave JSON de `localStorage` (`paginas-del-sol.estado.v1`).
- **Documento / Estado backend (TP1 Backend)**:
  La API REST de FastAPI y PostgreSQL utiliza claves primarias enteras autoincrementales (`id: int`), y espera enteros positivos en los parámetros de ruta y claves foráneas (`1`, `2`, `3`).
- **Impacto**:
  Si el frontend intentara enviar cadenas como `"LI-1"` en `POST /ventas/` o en consultas `GET /libros/{id}`, FastAPI respondería inmediatamente con **HTTP 422 Unprocessable Entity** (como se demostró en el caso C-01).
- **Resolución propuesta**:
  Reemplazar por completo el acceso a `localStorage` en los formularios y tablas por llamadas HTTP asincrónicas (`fetch`) hacia los endpoints `/api/*`. Adaptar los modelos de datos en el cliente web para trabajar exclusivamente con enteros en los identificadores provistos por PostgreSQL.

---

### IN-02 — Estructura del Payload en el Alta de Libros (`autorIds` vs `AutoriaCreate`)

- **Documento / Estado previo (TP2 Frontend)**:
  El formulario de alta de libros tomaba las casillas de verificación seleccionadas y generaba un array de IDs planos: `autorIds: ["AU-1", "AU-2"]`.
- **Documento / Estado backend (TP1 Backend)**:
  El esquema `LibroCreate` en FastAPI exige una lista de objetos tipados:
  ```json
  "autores": [
    { "autor_id": 1, "rol": "autor", "orden": 1 },
    { "autor_id": 2, "rol": "coautor", "orden": 2 }
  ]
  ```
  donde `rol` debe pertenecer a `('autor', 'coautor', 'traductor', 'ilustrador')` y `orden >= 1`.
- **Impacto**:
  Un envío con el formato anterior provocaría un fallo de validación HTTP 422 en el backend al intentar dar de alta un libro.
- **Resolución propuesta**:
  Actualizar la lógica de captura en `frontend/js/libros.js` para construir la lista estructurada de autorías. Se asignará por defecto `rol: "autor"` (o selector de rol por autor marcado) y un `orden` correlativo secuencial (1, 2, 3...) para cada autor seleccionado, satisfaciendo estrictamente el contrato de `LibroCreate`.

---

### IN-03 — Autores en Listado de Catálogo (`LibroListado`) vs Detalle (`LibroDetalle`)

- **Documento / Estado previo (TP2 Frontend)**:
  El catálogo de frontend esperaba que cada libro del array contara con su lista de nombres de autores disponible de forma síncrona en la tarjeta.
- **Documento / Estado backend (TP1 Backend)**:
  Para optimizar el rendimiento y evitar transferencias excesivas de datos en listas extensas, el endpoint `GET /libros/` retorna el esquema liviano `LibroListado` (con `id`, `isbn`, `titulo`, `precio`, `stock`, `editorial` y `genero`), pero **no incluye la colección de autorías**. La lista completa de autores solo se resuelve en `GET /libros/{id}` (`LibroDetalle`).
- **Impacto**:
  Al renderizar las tarjetas del catálogo directamente desde `GET /api/libros/`, el campo de autores podría aparecer vacío si no se coordina la estrategia de consulta.
- **Resolución propuesta**:
  Para mantener una experiencia de usuario rica en el catálogo del frontend, al cargar el listado de libros se pueden obtener los detalles correspondientes o adaptar una consulta complementaria que asocie los autores, garantizando que cada tarjeta muestre a sus creadores respetando la regla `lazy="raise"` en el servidor.

---

### IN-04 — Automatización de Migraciones de Alembic en Despliegue

- **Documento / Estado previo (TP1 Backend)**:
  Las migraciones se ejecutaban interactivamente por consola mediante el comando `alembic upgrade head` dentro del entorno virtual local.
- **Documento / Estado objetivo (Easypanel)**:
  En un despliegue en la nube desatendido, el contenedor backend debe garantizar que el esquema relacional en PostgreSQL esté completamente actualizado antes de que el servidor Uvicorn comience a procesar tráfico HTTP.
- **Impacto**:
  Si el contenedor backend inicia antes de correr las migraciones, la base de datos vacía no tendrá las tablas creadas, haciendo fallar el health check `/health/ready` con HTTP 503 y abortando las consultas.
- **Resolución propuesta**:
  Configurar el comando de inicio (`CMD` o `ENTRYPOINT`) del contenedor backend para ejecutar secuencialmente:
  ```bash
  alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000
  ```
  Esto asegura idempotencia y garantiza que el esquema esté listo en cada despliegue.

---

## Preguntas abiertas (priorizadas)

| Prioridad | Pregunta | Bloquea | Decisor | Estado / Resolución recomendada |
|---|---|---|---|---|
| **Alta** | ¿Se deben cargar los datos semilla de `seed.py` de forma automática al iniciar el contenedor o mediante un comando manual posterior? | Pruebas iniciales de evaluación | Equipo Técnico / Docente | **Recomendación**: Ejecutar `alembic upgrade head` en el arranque del contenedor y proveer una vía sencilla para ejecutar `python -m scripts.seed` (vía terminal de Easypanel o script de inicio condicional). |
| **Media** | En el catálogo web, ¿conviene mantener la búsqueda del lado del cliente o delegarla siempre al backend con `GET /api/libros/?titulo=...`? | Rendimiento y consistencia | Arquitecto Frontend | **Recomendación**: Delegar siempre la búsqueda al backend (`GET /api/libros/?titulo=...`) con un leve *debounce* (300 ms) o al presionar Enter/Buscar, para ejercitar la consulta segura con `ILIKE` y cumplir el caso G-01. |
| **Baja** | ¿Conviene incorporar un botón de recarga rápida de datos en la interfaz web para sincronizar cambios externos? | Usabilidad en demostraciones | Operador de Librería | **Recomendación**: Mantener refrescos automáticos tras cada alta/venta y habilitar que hacer clic en la pestaña "Catálogo" vuelva a consultar la API. |
