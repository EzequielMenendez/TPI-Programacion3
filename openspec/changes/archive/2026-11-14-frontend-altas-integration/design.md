# Diseño · C-02 frontend-altas-integration

## Cliente HTTP

`apiFetch(ruta, { metodo, parametros, cuerpo })` arma `"/api" + ruta`, agrega
la query con `URLSearchParams`, envía JSON y devuelve `{ status, datos }`.
Cualquier respuesta no 2xx (o un fallo de red, status 0) se lanza como
`ErrorApi` con `mensajes: string[]`:

- `{"detail": "texto"}` (404/409 de dominio) → `["texto"]`.
- `{"detail": [{loc, msg}]}` (422 de Pydantic) → `"campo: msg"` por error,
  quitando el primer segmento `body`/`query`/`path` del `loc`.
- Sin cuerpo JSON → `"El servidor respondió con un error (N)."`.

## Selectores (DD-01)

Al montar se piden en paralelo `GET /editoriales/`, `/generos/`, `/autores/` y
`/libros/` con `limit=100` (el máximo de RN-10). Si alguno falla, los demás se
cargan igual y el error se lista junto al formulario.

Los autores se muestran como casillas, cada una con su `<select>` de rol
(deshabilitado hasta marcarla). Al marcar se consulta `GET /autores/{id}`
(verificación puntual); un 404 no agrega la autoría y avisa. El estado vive en
`autoriasLibro` en el orden de marcado, y `orden = posición + 1` al construir
el cuerpo, así desmarcar renumera sin huecos.

## Validación local

Replica el contrato `LibroCreate` / `ClienteCreate` para avisar antes de
enviar: ISBN `^[0-9][0-9-]{8,15}[0-9Xx]$`, precio `^\d{1,8}(\.\d{1,2})?$` y
mayor que 0 (viaja como texto para no perder centavos), stock entero
`0..2147483647`, título ≤ 200, nombre ≤ 120, email con formato. La unicidad
de ISBN y email no se chequea en el cliente (DD-04): la decide la base.

## Resultado

Durante el envío el botón queda deshabilitado. Con 201 se agrega el registro
devuelto a la tabla, se resetea el formulario (el `reset` también limpia las
autorías) y se emite el evento con `detail`. Con error se muestran los
mensajes y no se toca el formulario.
