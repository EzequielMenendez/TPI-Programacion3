# Evidencia de Verificación · Evaluación Global de Programación III

Esta carpeta reúne la evidencia técnica y funcional exigida por la consigna del **Global de Programación III** (página 9 del PDF) para la librería **«Páginas del Sol»**.

> **Nota de privacidad**: todos los datos registrados corresponden a los datos ficticios de prueba generados por `python -m scripts.seed`. No se incluyen contraseñas ni variables privadas.

---

## Contenido de la Carpeta

| Archivo / Ruta | Descripción |
|---|---|
| [`C-07_consultas.txt`](C-07_consultas.txt) | Salida de `python -m scripts.evidencia_c07` demostrando que `GET /libros/{id}` (con 1 o 3 autores) y `GET /ventas/{id}` (con 1 o 2 renglones) emiten siempre **exactamente 2 consultas SQL** (`joinedload` + `selectinload` con `lazy="raise"`). |
| [`verificar_global.py`](verificar_global.py) | Script automatizado que ejecuta de punta a punta los casos `G-01` a `G-07` contra el servidor o reverse proxy (`/api/`) y valida códigos de estado HTTP y contratos JSON. |
| [`G-01_a_G-07/G-01_catalogo.md`](G-01_a_G-07/G-01_catalogo.md) | **Caso G-01 · Catálogo**: búsqueda parcial insensible por título (`"RAYU"`), paginación con `limit` y `offset`, búsqueda sin coincidencias, etiqueta «Sin clasificar» y consulta de detalle `GET /api/libros/{id}`. |
| [`G-01_a_G-07/G-02_alta_libro.md`](G-01_a_G-07/G-02_alta_libro.md) | **Caso G-02 · Alta de libro**: creación con stock, género opcional y autorías con rol/orden (`201 Created`), consulta de detalle y rechazo de ISBN repetido (`409 Conflict`) conservando el borrador en pantalla. |
| [`G-01_a_G-07/G-03_alta_cliente.md`](G-01_a_G-07/G-03_alta_cliente.md) | **Caso G-03 · Alta de cliente**: creación de cliente (`201 Created`), recuperación individual por ID con `GET /api/clientes/{id}` y rechazo de email repetido (`409 Conflict`) conservando el borrador. |
| [`G-01_a_G-07/G-04_venta_persistencia.md`](G-01_a_G-07/G-04_venta_persistencia.md) | **Caso G-04 · Venta**: alta de venta válida con dos renglones (`201 Created`), importes devueltos por la API, descuento de stock y verificación del detalle en el historial tras recargar la página. |
| [`G-01_a_G-07/G-05_precio_historico.md`](G-01_a_G-07/G-05_precio_historico.md) | **Caso G-05 · Precio histórico**: actualización del precio de catálogo mediante `PATCH /api/libros/{id}` y comprobación de que la venta anterior en el historial conserva sus importes congelados. |
| [`G-01_a_G-07/G-06_rechazo_409_422.md`](G-01_a_G-07/G-06_rechazo_409_422.md) | **Caso G-06 · Rechazo**: intento de venta con ID inexistente / stock insuficiente (`409 Conflict`) y con renglones repetidos (`422 Unprocessable Entity`), verificando que el borrador se conserva y el historial no cambia. |
| [`G-01_a_G-07/G-07_despliegue_salud.md`](G-01_a_G-07/G-07_despliegue_salud.md) | **Caso G-07 · Despliegue**: construcción de imágenes Docker, verificación de `/api/health/ready` (`200 OK`), acceso por HTTPS sin errores de CORS y persistencia de datos en PostgreSQL tras redespliegue. |
| [`G-01_a_G-07/salida_verificador_url_publica.txt`](G-01_a_G-07/salida_verificador_url_publica.txt) | Salida real del verificador ejecutado contra la URL pública `https://grupo3-mateo-frontend.ugpvou.easypanel.host/api` (todos los casos OK). |
| [`capturas/`](capturas/) | Capturas tomadas desde la URL pública y desde Easypanel: catálogo (G-01), 409 de ISBN (G-02), cliente por ID y 409 de email (G-03), venta 201 y detalle tras recargar (G-04), precio histórico (G-05), 409 con borrador conservado (G-06), logs de migraciones, health/seed y redespliegue (G-07). Sin contraseñas. |

---

## Cómo Ejecutar el Verificador Automatizado

Con el entorno levantado y la base recién inicializada con `python -m scripts.seed`:

```bash
# Contra el proxy unificado (Nginx local o URL pública con /api):
python evidencia/verificar_global.py http://localhost/api

# O directamente contra el backend FastAPI:
python evidencia/verificar_global.py http://localhost:8000
```
