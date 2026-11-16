# Librería «Páginas del Sol» · Evaluación Global de Programación III

**Universidad Tecnológica Nacional (UTN)** · Tecnicatura Universitaria en Programación  
**Asignatura**: Programación III — Evaluación Global: Integración y Despliegue

## Integrantes del Grupo

- **Ignacio Rodríguez**
- **Ezequiel Menéndez**
- **Mateo Algañaraz**
- **Nicolás Morón**
- **Santiago Barretto**

---

## 1. Descripción General y Alcance

Aplicación web completa e integrada para la gestión de la librería **«Páginas del Sol»**, que conecta las pantallas del frontend (desarrolladas en HTML5 semántico, CSS3 y JavaScript nativo sin frameworks ni CDNs) con la API RESTful asincrónica construida en **FastAPI**, **SQLModel / SQLAlchemy 2.0 (async)**, **PostgreSQL 16** y **Alembic**.

La solución se empaqueta en contenedores Docker:
- **Frontend (`nginx:1.30-alpine`)**: sirve los recursos estáticos desde `frontend/public/` en el puerto interno `80` y actúa como *reverse proxy* bajo el mismo origen reenviando `/api/` hacia el servicio backend (`http://${API_UPSTREAM}/`), evitando problemas de CORS.
- **Backend (`python:3.12-slim`)**: aplica automáticamente las migraciones de esquema (`alembic upgrade head`) al iniciar el contenedor y expone la API con Uvicorn en `0.0.0.0:8000`.
- **Base de Datos (`postgres:16-alpine`)**: persiste de forma transaccional (ACID) el catálogo de libros, editoriales, géneros, autores con rol y orden, clientes, ventas multirrenglón e importes históricos congelados.

---

## 2. Estructura del Repositorio

```text
.
├── frontend/
│   ├── Dockerfile               # Imagen nginx:1.30-alpine con envsubst acotado a API_UPSTREAM
│   ├── .dockerignore            # Exclusión de .git, .env, node_modules, tests y metadatos
│   ├── default.conf.template    # Configuración de Nginx (archivos estáticos + proxy /api/)
│   ├── public/                  # Recursos públicos servidos por Nginx
│   │   ├── index.html           # Interfaz unificada (Catálogo, Libros, Clientes, Ventas, Historial)
│   │   ├── css/styles.css       # Hojas de estilo nativas
│   │   └── js/
│   │       ├── api.js           # Cliente HTTP centralizado (API_BASE = "/api", ErrorApi)
│   │       ├── catalogo.js      # Ejercicio 1: listado paginado, filtro por título y detalle
│   │       ├── libros.js        # Ejercicio 2: alta de libros, autorías con rol/orden y verificación
│   │       ├── clientes.js      # Ejercicio 2: alta de clientes y consulta individual por ID
│   │       ├── ventas-modelo.js # Ejercicio 3: validaciones de borrador y cálculos seguros
│   │       ├── ventas.js        # Ejercicio 3: confirmación POST /ventas/ e historial paginado
│   │       ├── navegacion.js    # Gestión accesible de vistas (aria-current)
│   │       ├── utilidades.js    # Funciones auxiliares de DOM seguro (textContent)
│   │       └── datos.js         # Datos semilla de respaldo para pruebas unitarias aisladas
│   └── tests/                   # Suite de 46 pruebas automatizadas con Node.js (node:test)
├── backend/
│   ├── Dockerfile               # Imagen python:3.12-slim (alembic upgrade head + uvicorn)
│   ├── .dockerignore            # Exclusión de .git, .env, .venv, __pycache__, .pytest_cache
│   ├── requirements.txt         # Dependencias de Python para el contexto de build /backend
│   ├── env.example              # Plantilla de variables de entorno (DATABASE_URL, SQL_ECHO)
│   ├── alembic.ini              # Configuración de migraciones Alembic
│   ├── migrations/              # Versiones de esquema de base de datos
│   ├── scripts/
│   │   ├── seed.py              # Carga inicial de datos ficticios de prueba
│   │   └── evidencia_c07.py     # Verificación de consultas SQL sin problema N+1 (lazy="raise")
│   ├── app/                     # Código fuente de la API FastAPI (core y módulos de dominio)
│   └── test/                    # Colecciones de pruebas HTTP (.http) para REST Client
├── docker-compose.yml           # Orquestación local de los 3 servicios (db, backend, frontend)
├── env.example                  # Plantilla de variables de entorno en la raíz
├── DEPLOY.md                    # Guía detallada de despliegue en Easypanel y resolución de fallos
└── README.md                    # Este documento
```

---

## 3. Cómo Ejecutar la Aplicación Localmente y Cargar Datos de Prueba

Se proveen dos formas de levantar el entorno local: **con Docker Compose** (un solo comando) o **paso a paso** siguiendo la Guía de Despliegue del PDF.

### Opción A · Ejecución integrada con Docker Compose (Recomendada)

Requisitos: Docker y Docker Compose en ejecución.

1. **Construir las imágenes e iniciar los tres contenedores (`db`, `backend`, `frontend`)**:
   ```bash
   docker compose up --build -d
   ```
   *(El servicio `backend` espera a que PostgreSQL responda saludable y ejecuta automáticamente `alembic upgrade head` antes de iniciar Uvicorn).*

2. **Cargar los datos ficticios de prueba (`seed`)**:
   ```bash
   docker compose exec backend python -m scripts.seed
   ```

3. **Abrir y verificar la aplicación**:
   - **Interfaz web (Nginx)**: [http://localhost](http://localhost)
   - **Salud de la API vía proxy**: [http://localhost/api/health/ready](http://localhost/api/health/ready) *(debe devolver HTTP `200` con `{"estado":"listo","base":"ok"}`)*
   - **Documentación interactiva (FastAPI)**: [http://localhost:8000/docs](http://localhost:8000/docs)

4. **Detener el entorno**:
   ```bash
   docker compose down
   ```

---

### Opción B · Ejecución paso a paso (Guía de Despliegue 2 de 5 del PDF)

Requisitos: Python 3.12+, PostgreSQL 16 en ejecución y Docker.

#### 1. Preparar la base de datos y el entorno del backend
Crear una base de datos vacía en PostgreSQL:
```sql
CREATE DATABASE libreria;
```

Entrar en `backend/`, crear el entorno virtual e instalar las dependencias:
```bash
cd backend
python -m venv .venv
# Linux / macOS:
source .venv/bin/activate
# Windows (PowerShell):
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

Copiar el archivo de ejemplo `env.example` a `.env` y ajustar las credenciales locales:
```bash
cp env.example .env   # En Windows PowerShell: Copy-Item env.example .env
```
Contenido de `.env` (no versionado):
```env
DATABASE_URL=postgresql+asyncpg://usuario:contraseña@localhost:5432/libreria
SQL_ECHO=true
```

#### 2. Aplicar las migraciones y cargar los datos de prueba
Desde `backend/` con el entorno virtual activo:
```bash
alembic upgrade head
python -m scripts.seed
```

El script `scripts.seed` vacía las tablas, reinicia las secuencias y carga el siguiente conjunto de **datos ficticios conocidos**:

| Recurso | Registros iniciales cargados |
|---|---|
| **Editoriales** | `1` Sudamericana · `2` Anagrama · `3` Emecé |
| **Géneros** | `1` Novela · `2` Cuento · `3` Ensayo |
| **Autores** | `1` Julio Cortázar · `2` Ricardo Piglia · `3` Adolfo Bioy Casares · `4` Silvina Ocampo · `5` Jorge Luis Borges |
| **Libros** | `1` *Rayuela* ($ 25.000, stock 10) · `2` *Bestiario* ($ 18.500, stock 5) · `3` *Ficciones* ($ 22.000, stock 8) · `4` *Respiración artificial* ($ 27.000, stock 4) · `5` *Antología de la literatura fantástica* ($ 31.000, stock 3, **sin género** → muestra «Sin clasificar», con **3 autores** ordenados) |
| **Clientes** | `1` Ana Pérez (`ana@example.com`, con perfil) · `2` Tomás Ríos (`tomas@example.com`, sin perfil) |
| **Ventas** | `1` Venta inicial asociada a Ana Pérez (1 renglón) |

#### 3. Iniciar el servidor FastAPI
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### 4. Construir y ejecutar el contenedor del frontend
En otra terminal, ubicarse en `frontend/` y ejecutar:

- **En Linux**:
  ```bash
  cd frontend
  docker build -t libreria-frontend .
  docker run --rm --name libreria-frontend \
    -p 127.0.0.1:8080:80 \
    --add-host=host.docker.internal:host-gateway \
    -e API_UPSTREAM=host.docker.internal:8000 libreria-frontend
  ```
- **En Docker Desktop (Windows / macOS — PowerShell)**:
  ```powershell
  cd frontend
  docker build -t libreria-frontend .
  docker run --rm --name libreria-frontend -p 127.0.0.1:8080:80 -e API_UPSTREAM=host.docker.internal:8000 libreria-frontend
  ```

Abrir [http://127.0.0.1:8080](http://127.0.0.1:8080) en el navegador y verificar que [http://127.0.0.1:8080/api/health/ready](http://127.0.0.1:8080/api/health/ready) responde `200`.

---

## 4. Decisiones de Implementación y Cumplimiento de Consignas

### Ejercicio 1 · Catálogo y cliente HTTP
- **Centralización de `fetch`**: `frontend/public/js/api.js` es el único módulo que construye URLs con prefijo `/api` y conserva la barra final en rutas de colección (`/api/libros/`, `/api/editoriales/`, `/api/generos/`, `/api/autores/`, `/api/clientes/`, `/api/ventas/`).
- **Paginación y búsqueda**: `GET /api/libros/` envía `limit` (1 a 100, por defecto 20), `offset` (desde 0) y `titulo` (búsqueda parcial insensible a mayúsculas). Al modificar el filtro o el límite, `offset` vuelve automáticamente a `0`.
- **Tarjetas y detalle**: cada tarjeta muestra título, ISBN, precio formateado en ARS, editorial y género (mostrando `«Sin clasificar»` cuando `genero` es `null`). El botón **«Ver autores»** consulta `GET /api/libros/{id}` y despliega los autores ordenados por `orden` con su `rol`. Se diferencian explícitamente los estados de *carga*, *lista vacía*, *búsqueda sin coincidencias* y *error de conexión*, insertando texto únicamente mediante `textContent`.

### Ejercicio 2 · Alta de libros y clientes (Opción elegida para selectores y consultas por ID)
- **Documentación de la opción elegida para selectores**: dado que nuestra API del TP expone tanto los listados de colección (`GET /editoriales/`, `GET /generos/`, `GET /autores/`, `GET /clientes/`) como las consultas individuales por identificador (`GET /autores/{id}`, `GET /clientes/{id}`), se implementó una estrategia combinada:
  1. Los `<select>` de editoriales, géneros, clientes y libros, así como la grilla de casillas de autores, se pueblan inicialmente desde los endpoints de listado (`limit=100&offset=0`).
  2. Al marcar un autor para un libro, el frontend verifica en vivo su existencia consultando `GET /api/autores/{id}` antes de consolidarlo en la lista de autorías, asignándole el `orden` correlativo de selección (`1, 2, 3…`) y el `rol` elegido (`autor`, `coautor`, `traductor` o `ilustrador`).
  3. En la sección **Clientes**, además del listado y formulario de alta, se incluye un buscador puntual por ID que consume `GET /api/clientes/{id}` y muestra el nombre y correo del cliente encontrado (o el mensaje `404` del servidor si no existe).
- **Preservación de borradores**: un alta exitosa (`201 Created`) utiliza el registro devuelto por la API para actualizar las tablas y los selectores de Ventas (`libros-actualizados` / `clientes-actualizados`) y limpia el formulario. Ante un error `409` (ISBN o email duplicado) o `422`, se muestran los mensajes del servidor junto al formulario y **se conservan intactos todos los datos ingresados**.

### Ejercicio 3 · Registrar y consultar ventas e historial
- **Envío estricto de `POST /api/ventas/`**: el cuerpo enviado contiene únicamente `{"cliente_id": <int>, "renglones": [{"libro_id": <int>, "cantidad": <int>}]}` respetando `extra="forbid"` del backend. El botón de envío se deshabilita mientras se procesa la petición.
- **Confirmación e inmutabilidad histórica**: al recibir `201 Created`, se muestran en pantalla los precios unitarios copiados del catálogo, los subtotales y el total calculados por el backend, se limpia el borrador y se actualiza el historial. Si la API rechaza la operación con `409` (stock insuficiente, cliente o libro inexistente) o `422` (renglones con libros repetidos o cantidades inválidas), **el borrador de la venta se conserva intacto en memoria**.
- **Historial paginado**: consulta `GET /api/ventas/` con `limit` y `offset`, y al abrir el detalle invoca `GET /api/ventas/{id}` mostrando fecha, cliente, renglones e importes históricos que permanecen inalterados aunque luego cambie el precio del libro con `PATCH /api/libros/{id}`.

---

## 5. Casos de Prueba de Verificación Global (`G-01` a `G-07`)

Los procedimientos detallados de despliegue y diagnóstico se encuentran en [DEPLOY.md](DEPLOY.md). A continuación se resume la matriz de verificación exigida en la página 9 del PDF:

| Caso | Descripción y pasos a ejecutar | Resultado esperado / verificado |
|---|---|---|
| **G-01 · Catálogo** | Buscar por título (ej. `"RAYU"`), avanzar y retroceder con `limit` y `offset`, probar una búsqueda sin coincidencias y abrir el detalle de un libro con «Ver autores». | `GET /api/libros/` filtra sin distinguir mayúsculas, pagina correctamente, informa cuando no hay coincidencias y `GET /api/libros/{id}` muestra los autores con su rol y orden (y «Sin clasificar» en el libro 5). |
| **G-02 · Alta de libro** | Crear un libro con stock entero $\ge 0$, género opcional y autorías con rol. Consultar su detalle en el catálogo. Luego repetir el mismo ISBN y enviar. | La primera alta responde `201 Created`, limpia el formulario y agrega el libro al catálogo y selectores. El ISBN repetido responde `409 Conflict`, muestra el mensaje del servidor y conserva todos los datos cargados en el formulario. |
| **G-03 · Alta de cliente** | Crear un cliente con nombre y email válido y recuperarlo por ID con el buscador (`GET /api/clientes/{id}`). Repetir el mismo email y enviar. | El alta responde `201 Created` y `GET /api/clientes/{id}` muestra su nombre y correo.Al repetir el email, el servidor responde `409 Conflict` y el formulario conserva el borrador sin vaciarse. |
| **G-04 · Venta** | Seleccionar un cliente, agregar dos renglones de libros distintos con cantidades enteras positivas y confirmar la venta. Recargar la página y abrir el detalle en el historial. | `POST /api/ventas/` devuelve `201 Created` con precios unitarios, subtotales y total calculados por la API. Tras recargar la página (`F5`), `GET /api/ventas/{id}` devuelve exactamente el mismo detalle persistido en PostgreSQL. |
| **G-05 · Precio histórico** | Cambiar el precio de un libro vendido mediante `PATCH /api/libros/{id}` y volver a abrir el detalle de la venta anterior en el historial. | El catálogo muestra el nuevo precio actualizado del libro, mientras que la venta histórica conserva inmutables el `precio_unitario` y el `total` originales del momento de la venta. |
| **G-06 · Rechazo** | Probar una venta con un ID inexistente o stock insuficiente (`409`) y un envío con renglones de libros repetidos (`422`). | El servidor rechaza con `409` y `422` respectivamente, se muestra el motivo del rechazo, **el borrador de la venta permanece en pantalla** y el historial de ventas no sufre alteraciones. |
| **G-07 · Despliegue** | Construir la imagen del frontend y del backend, publicar en Easypanel con HTTPS, consultar `/api/health/ready` y redesplegar el servicio. | La imagen se construye sin errores, la URL pública abre por HTTPS sin errores de CORS, `/api/health/ready` devuelve `200` y los datos en PostgreSQL persisten tras un redespliegue. |

---

## 6. Ejecución de Pruebas Automatizadas

Para correr la batería de 46 tests unitarios y de integración del frontend con Node.js (sin dependencias externas):

```bash
node --test frontend/tests/*.test.cjs
```

Para verificar en el backend que las consultas de detalle de libro y de venta se resuelven en exactamente 2 sentencias SQL sin problema N+1 (`lazy="raise"`):

```bash
cd backend
python -m scripts.evidencia_c07
```
