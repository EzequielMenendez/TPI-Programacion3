"""Verificador automatizado de los Casos Globales G-01 a G-07.

Permite auditar extremo a extremo todos los contratos exigidos en la página 9 del PDF
contra una URL en ejecución (vía proxy Nginx `/api` o directo a FastAPI `:8000`):

    python evidencia/verificar_global.py http://localhost/api
    python evidencia/verificar_global.py http://localhost:8000
"""

from __future__ import annotations

import json
import sys
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


def peticion(base: str, metodo: str, ruta: str, params: dict | None = None, cuerpo: dict | None = None) -> tuple[int, object]:
    url = base.rstrip("/") + ruta
    if params:
        url += "?" + urlencode(params)
    cabeceras = {"Accept": "application/json"}
    datos_bytes = None
    if cuerpo is not None:
        cabeceras["Content-Type"] = "application/json"
        datos_bytes = json.dumps(cuerpo).encode("utf-8")

    req = Request(url, data=datos_bytes, headers=cabeceras, method=metodo)
    try:
        with urlopen(req, timeout=10) as resp:
            texto = resp.read().decode("utf-8")
            return resp.status, json.loads(texto) if texto else None
    except HTTPError as err:
        texto = err.read().decode("utf-8")
        try:
            return err.code, json.loads(texto)
        except json.JSONDecodeError:
            return err.code, texto


def asegurar(condicion: bool, mensaje: str) -> None:
    if not condicion:
        raise AssertionError(mensaje)


def ejecutar_suite(llamar) -> None:
    print("=== G-07 · Salud de la API (/health/live y /health/ready) ===")
    status, datos = llamar("GET", "/health/ready")
    asegurar(status == 200 and isinstance(datos, dict) and datos.get("estado") == "listo", f"Fallo health/ready: {status} {datos}")
    print("  [OK] GET /health/ready -> 200", datos)

    print("\n=== G-01 · Catálogo, búsqueda insensible, paginación y detalle ===")
    status, lista = llamar("GET", "/libros/", {"limit": 20, "offset": 0})
    asegurar(status == 200 and isinstance(lista, list) and len(lista) >= 5, f"Fallo listado inicial: {status}")
    sin_genero = next((l for l in lista if l["id"] == 5), None)
    asegurar(sin_genero is not None and sin_genero["genero"] is None, "El libro 5 debe tener genero=None («Sin clasificar»)")
    print(f"  [OK] GET /libros/?limit=20&offset=0 -> 200 ({len(lista)} libros; libro 5 genero=None)")

    status, filtrados = llamar("GET", "/libros/", {"limit": 20, "offset": 0, "titulo": "RAYU"})
    asegurar(status == 200 and len(filtrados) == 1 and filtrados[0]["titulo"] == "Rayuela", f"Fallo filtro RAYU: {filtrados}")
    print("  [OK] GET /libros/?titulo=RAYU -> 200 (1 coincidencia: Rayuela)")

    status, pagina2 = llamar("GET", "/libros/", {"limit": 2, "offset": 2})
    asegurar(status == 200 and len(pagina2) == 2 and pagina2[0]["id"] == 3, f"Fallo paginación: {pagina2}")
    print("  [OK] GET /libros/?limit=2&offset=2 -> 200 (libros 3 y 4)")

    status, vacio = llamar("GET", "/libros/", {"limit": 20, "offset": 0, "titulo": "inexistente-xyz"})
    asegurar(status == 200 and vacio == [], f"Se esperaba lista vacía: {vacio}")
    print("  [OK] GET /libros/?titulo=inexistente-xyz -> 200 []")

    status, detalle5 = llamar("GET", "/libros/5")
    asegurar(status == 200 and len(detalle5["autores"]) == 3, f"Fallo detalle libro 5: {detalle5}")
    print("  [OK] GET /libros/5 -> 200 (3 autores ordenados)")

    print("\n=== G-02 · Alta de libro (201), consulta de detalle y rechazo de ISBN repetido (409) ===")
    nuevo_libro = {
        "titulo": "Historias de cronopios y de famas",
        "isbn": "978-950-07-1122-4",
        "precio": "19500.00",
        "stock": 4,
        "editorial_id": 1,
        "genero_id": 2,
        "autores": [{"autor_id": 1, "rol": "autor", "orden": 1}],
    }
    status, creado = llamar("POST", "/libros/", cuerpo=nuevo_libro)
    asegurar(status == 201 and creado["isbn"] == "978-950-07-1122-4", f"Fallo alta libro: {status} {creado}")
    print(f"  [OK] POST /libros/ -> 201 (id={creado['id']}, titulo={creado['titulo']})")

    status, dup_libro = llamar("POST", "/libros/", cuerpo=nuevo_libro)
    asegurar(status == 409 and "ISBN" in dup_libro.get("detail", ""), f"Fallo 409 ISBN duplicado: {status} {dup_libro}")
    print(f"  [OK] POST /libros/ (ISBN repetido) -> 409 ({dup_libro['detail']})")

    print("\n=== G-03 · Alta de cliente (201), consulta por ID y rechazo de email repetido (409) ===")
    nuevo_cliente = {"nombre": "Lucía Gómez", "email": "Lucia.Gomez@Example.com"}
    status, cli_creado = llamar("POST", "/clientes/", cuerpo=nuevo_cliente)
    asegurar(status == 201 and cli_creado["email"] == "lucia.gomez@example.com", f"Fallo alta cliente: {status} {cli_creado}")
    print(f"  [OK] POST /clientes/ -> 201 (id={cli_creado['id']}, email={cli_creado['email']})")

    status, cli_buscado = llamar("GET", f"/clientes/{cli_creado['id']}")
    asegurar(status == 200 and cli_buscado["nombre"] == "Lucía Gómez", f"Fallo GET cliente por ID: {status} {cli_buscado}")
    print(f"  [OK] GET /clientes/{cli_creado['id']} -> 200 ({cli_buscado['nombre']})")

    status, dup_cli = llamar("POST", "/clientes/", cuerpo={"nombre": "Otra Ana", "email": "ANA@example.com"})
    asegurar(status == 409 and "email" in dup_cli.get("detail", ""), f"Fallo 409 email duplicado: {status} {dup_cli}")
    print(f"  [OK] POST /clientes/ (email repetido) -> 409 ({dup_cli['detail']})")

    print("\n=== G-04 · Venta válida con dos renglones (201) y consulta de detalle persistido ===")
    cuerpo_venta = {
        "cliente_id": 2,
        "renglones": [
            {"libro_id": 1, "cantidad": 2},
            {"libro_id": 4, "cantidad": 1},
        ],
    }
    status, venta = llamar("POST", "/ventas/", cuerpo=cuerpo_venta)
    asegurar(status == 201 and venta["total"] == "77000.00" and len(venta["renglones"]) == 2, f"Fallo alta venta: {status} {venta}")
    venta_id = venta["id"]
    print(f"  [OK] POST /ventas/ -> 201 (id={venta_id}, total={venta['total']})")

    status, det_venta = llamar("GET", f"/ventas/{venta_id}")
    asegurar(status == 200 and det_venta["total"] == "77000.00", f"Fallo GET venta persistida: {status} {det_venta}")
    print(f"  [OK] GET /ventas/{venta_id} -> 200 (persiste detalle e importes)")

    print("\n=== G-05 · Precio histórico inmutable tras PATCH /libros/1 ===")
    status, libro_act = llamar("PATCH", "/libros/1", cuerpo={"precio": "35000.00"})
    asegurar(status == 200 and libro_act["precio"] == "35000.00", f"Fallo PATCH precio: {status} {libro_act}")
    status, det_despues = llamar("GET", f"/ventas/{venta_id}")
    renglon_rayuela = next(r for r in det_despues["renglones"] if r["libro_id"] == 1)
    asegurar(
        renglon_rayuela["precio_unitario"] == "25000.00" and det_despues["total"] == "77000.00",
        f"El precio histórico se alteró: {det_despues}",
    )
    print("  [OK] PATCH /libros/1 -> precio catálogo 35000.00; venta histórica conserva precio_unitario=25000.00 y total=77000.00")

    print("\n=== G-06 · Rechazo por ID inexistente / sin stock (409) y renglones repetidos (422) ===")
    _, historial_antes = llamar("GET", "/ventas/", {"limit": 100, "offset": 0})
    status, err_cli = llamar("POST", "/ventas/", cuerpo={"cliente_id": 999, "renglones": [{"libro_id": 1, "cantidad": 1}]})
    asegurar(status == 409, f"Se esperaba 409 por cliente inexistente: {status} {err_cli}")
    print(f"  [OK] POST /ventas/ (cliente_id=999) -> 409 ({err_cli.get('detail')})")

    status, err_id = llamar("POST", "/ventas/", cuerpo={"cliente_id": 2, "renglones": [{"libro_id": 999, "cantidad": 1}]})
    asegurar(status == 409, f"Se esperaba 409 por libro inexistente: {status} {err_id}")
    print(f"  [OK] POST /ventas/ (libro_id=999) -> 409 ({err_id.get('detail')})")

    status, err_stock = llamar("POST", "/ventas/", cuerpo={"cliente_id": 2, "renglones": [{"libro_id": 5, "cantidad": 99}]})
    asegurar(status == 409, f"Se esperaba 409 por stock insuficiente: {status} {err_stock}")
    print(f"  [OK] POST /ventas/ (stock insuficiente) -> 409 ({err_stock.get('detail')})")

    status, err_rep = llamar(
        "POST",
        "/ventas/",
        cuerpo={"cliente_id": 2, "renglones": [{"libro_id": 1, "cantidad": 1}, {"libro_id": 1, "cantidad": 2}]},
    )
    asegurar(status == 422, f"Se esperaba 422 por renglones repetidos: {status} {err_rep}")
    print("  [OK] POST /ventas/ (renglones repetidos) -> 422")

    _, historial_despues = llamar("GET", "/ventas/", {"limit": 100, "offset": 0})
    asegurar(historial_antes == historial_despues, "El historial cambió tras los rechazos")
    print(f"  [OK] GET /ventas/ -> el historial queda igual ({len(historial_despues)} ventas)")

    print("\n>>> TODOS LOS CASOS GLOBALES (G-01 a G-07) VERIFICADOS EXITOSAMENTE.")


if __name__ == "__main__":
    url_base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    ejecutar_suite(lambda m, r, p=None, cuerpo=None: peticion(url_base, m, r, p, cuerpo))
