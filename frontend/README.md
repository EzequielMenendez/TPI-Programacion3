# TPI · Frontend de una librería

Programación III · Tecnicatura Universitaria en Programación a Distancia (UTN)

Frontend de la librería «Páginas del Sol», hecho únicamente con HTML, CSS y
JavaScript nativos. Todo funciona en local: no usa librerías, frameworks,
CDNs, API, backend ni servidor. Los datos son ficticios y viven en el navegador.

## Integrantes

Según el historial del repositorio: Ezequiel Menéndez, Ignacio Martín Rodríguez,
Mateo Algañaraz, Nicolás Morón y Santiago Barretto.

## Cómo abrirlo

1. Descargar o clonar el repositorio.
2. Abrir `index.html` (en la raíz del repositorio) con doble clic en cualquier
   navegador actual. No hace falta npm, ni instalar nada, ni levantar un servidor.

## Ejercicio 5 · Reglas de la venta simulada

Se redondea cada precio al centavo más cercano antes de multiplicar. Cantidades,
centavos, subtotales y total deben ser enteros seguros de JavaScript. El precio
debe ser positivo y redondear al menos a un centavo. Valores no finitos y
desbordamientos se rechazan. Se calcula en centavos y se presenta en ARS con
dos decimales reutilizando el formato compartido del catálogo.
La presentación usa una cadena decimal exacta construida desde los centavos,
evitando perder un centavo al formatear importes cerca del límite seguro.

Un libro repetido se informa como error y no se agrega ni cambia la cantidad
anterior: la cantidad se modifica en su propio renglón. Se pueden quitar
renglones antes de confirmar.

Al confirmar se revalida todo contra los datos actuales. El registro histórico
guarda id `VE-n`, fecha ISO, copia de cliente (id, nombre, email), renglones
(id de libro, título, ISBN, cantidad, precio unitario y subtotal en centavos) y
total en centavos. Son copias independientes del catálogo y el borrador.
Un fallo conserva la venta pendiente; un éxito agrega una operación y limpia
el borrador. Las ventas confirmadas sólo se consultan.

Las altas válidas E4 notifican a los selectores de Ventas. Se actualizan sus
opciones sin recargar ni perder cliente, libro seleccionado o renglones.
La venta es académica: no hay stock, cobros ni facturación.

### Cómo probar E5

1. Ir a Ventas, seleccionar cliente y agregar libros con cantidades enteras.
2. Repetir un libro: debe informar el duplicado sin alterar la cantidad.
3. Cambiar cantidad en su renglón o usar Quitar: los importes se recalculan.
4. Dejar una cantidad vacía o inválida y confirmar: se informa el error, sin
   registrar ni vaciar la venta. Corregirla y confirmar.
5. Consultar Historial → Ver detalle: cantidades, precios y descripciones son
   las guardadas al confirmar. Preparar otra venta no cambia la anterior.
6. Dar de alta libro/cliente E4 con un borrador activo: aparecen en las opciones
   sin perderlo. Desde el Ejercicio 6, recargar conserva altas y ventas (localStorage).

## Estructura

```
./
├── index.html         Catálogo, altas, venta simulada e historial
├── css/styles.css     Estilos propios
└── js/
    ├── datos.js       Datos iniciales: editoriales, géneros, autores, libros y clientes
    ├── utilidades.js  Utilidades compartidas (ids siguientes, errores, celdas de tabla)
    ├── catalogo.js    Renderizado del catálogo, filtro por título y eventos
    ├── navegacion.js  aria-current de la navegación según la sección activa
    ├── libros.js      Alta de libros: opciones, validaciones y tabla
    ├── clientes.js    Alta de clientes: validaciones y tabla
    ├── ventas-modelo.js  Cantidades, centavos seguros, borrador y snapshots
    └── ventas.js      Interfaz de venta e historial de sólo consulta
tests/                 Pruebas opcionales con Node (no hacen falta para abrir la página)
openspec/              Especificaciones y cambios archivados (SDD)
docs/prompts.md        Prompts usados con IA
```

## Estado de los ejercicios

| Ejercicio | Estado |
|-----------|--------|
| 1 · Estructura y pantallas HTML | Implementado: `index.html` en la raíz, 5 vistas con navegación (ver `openspec/specs/estructura-pantallas-libreria/`) |
| 2 · Presentación CSS | CSS propio para catálogo, formularios y tablas de E3/E4/E5 |
| 3 · Datos locales, catálogo y filtro | Implementado |
| 4 · Altas de libros y clientes | Implementado; las altas persisten con el Ejercicio 6 |
| 5 · Ventas e Historial | Implementado; evidencia de pruebas al final |
| 6 · `localStorage` | Implementado: libros, clientes y ventas persisten localmente |

### Pantallas que funcionan hoy

- **Catálogo** (Ejercicio 3): buscador por título y tarjetas de los libros.
- **Libros** (Ejercicio 4): alta de libros con validaciones y tabla de listado.
- **Clientes** (Ejercicio 4): alta de clientes con validaciones y tabla de listado.
- **Ventas** (Ejercicio 5): cliente, renglones editables y confirmación simulada.
- **Historial** (Ejercicio 5): lista y detalle de snapshots confirmados de la sesión.

### Qué queda pendiente

- No quedan ejercicios pendientes dentro del alcance actual del frontend: los
  seis están implementados y los casos manuales del Ejercicio 6 fueron
  verificados el 21/10/2026 (ver «Casos manuales E6 (verificados el
  21/10/2026)», al final de este documento).

## Ejercicio 3 · Datos locales, catálogo y filtro

### Datos iniciales (`js/datos.js`)

Cada entidad es un array de objetos con un `id` estable (`ED-1`, `GE-1`,
`AU-1`, `LI-1`, `CL-1`…). Los libros se relacionan por id:

| Campo del libro | Relación | Obligatoria |
|-----------------|----------|-------------|
| `editorialId` | `EDITORIALES[].id` | Sí |
| `generoId` | `GENEROS[].id` (o `null`) | No: sin género se muestra «Sin clasificar» |
| `autorIds` | `AUTORES[].id` | Sí, uno o más |

Conjunto inicial: 6 libros, 2 editoriales, 2 géneros, 3 autores y 3 clientes.
El libro «Cuaderno de viaje» no tiene género, para mostrar «Sin clasificar».
Al iniciar, `validarRelacionesLibros` comprueba que todas las relaciones
existan y avisa en la consola si alguna falla.

### Catálogo y filtro (`js/catalogo.js`)

- El catálogo se genera desde el array `LIBROS`: cada tarjeta muestra título,
  ISBN, editorial, género, autores y precio (con dos decimales).
- El filtro por título quita los espacios de los extremos, no distingue
  mayúsculas de minúsculas y busca coincidencias parciales. Filtra mientras se
  escribe; Enter no recarga la página.
- Búsqueda vacía → catálogo completo. Sin coincidencias → mensaje
  «Sin resultados…» con el texto buscado. Catálogo vacío → mensaje propio.
- Todo el contenido se inserta con `textContent`, por lo que lo que escribe el
  usuario se muestra como texto y nunca se interpreta como HTML.

### Verificación realizada (Ejercicio 3)

Probado en Chromium (sin servidor, abriendo el archivo directamente):

| Caso | Resultado observado |
|------|---------------------|
| Búsqueda `"  VIEN  "` (mayúsculas y espacios) | Muestra solo «El viento del Aconcagua» |
| Búsqueda `"DE"` | 5 coincidencias parciales |
| Búsqueda vacía o solo espacios | Catálogo completo (6 libros) |
| Búsqueda `"zzz inexistente"` | 0 libros y mensaje «Sin resultados…» |
| Búsqueda `<img src=x onerror=alert(1)>` | Se muestra como texto literal |
| Libro sin género | Etiqueta y dato «Sin clasificar» |
| Anchos de 320 px y 1280 px | Sin desplazamiento horizontal de la página |
| Recorrido con Tab | Llega a buscador y botones con foco visible |
| Consola del navegador | Sin errores ni advertencias |

## Ejercicio 4 · Altas de libros y clientes

Las secciones `#libros` y `#clientes` se agregan a la misma página que el
catálogo; la navegación del encabezado marca con `aria-current="page"` la
sección activa según el hash (`js/navegacion.js`).

### Formulario de libros (`#form-libro`)

- Campos: título, ISBN, precio, editorial (select), género (select, con
  «Sin clasificar» como valor vacío) y autores.
- Los autores se muestran con **checkboxes** (no con select multiple) porque
  son pocas opciones que se ven todas a la vez: se alternan con un clic y el
  grupo va dentro de un `fieldset`.
- Las opciones de editorial, género y autores se generan desde `EDITORIALES`,
  `GENEROS` y `AUTORES` con `createElement` + `textContent`.
- Validaciones (se muestran **todos** los errores juntos, en un contenedor
  con `role="alert"`, y no se agrega el registro si falla alguna):
  título e ISBN no vacíos; ISBN único comparando sin espacios, guiones ni
  mayúsculas; precio numérico mayor que cero; editorial existente; al menos
  un autor existente; género opcional, pero si se asigna debe existir.
- El id nuevo es `LI-7`, `LI-8`… calculado con el **mayor sufijo numérico**
  existente (no con la cantidad de libros).

### Formulario de clientes (`#form-cliente`)

- Campos: nombre completo y email (sin apellido).
- Validaciones: nombre y email no vacíos; email con formato válido
  (`nombre@dominio.com`); email único comparando con `trim()` + minúsculas.
- El id nuevo es `CL-4`, `CL-5`… con el mismo criterio de mayor sufijo.

### Comportamiento común

- Ambos envíos usan `preventDefault()`: la página nunca se recarga.
- Tras un alta correcta: se limpia el formulario, se muestra un mensaje de
  éxito (`.message--info`, `role="status"`), se actualiza la tabla y, en el
  caso de los libros, también se refresca el catálogo con la búsqueda activa
  del momento (se reutiliza `renderizarCatalogo` + `filtrarPorTitulo`).
- Botón «Limpiar formulario» en ambos formularios: vacía campos, errores y
  mensaje, y devuelve el foco al primer campo.
- Todos los datos del usuario se insertan con `textContent`.

## Cómo probar las altas (Ejercicio 4)

### Alta de un libro

1. Abrir `index.html` y hacer clic en «Libros» (o abrir
   `index.html#libros` directamente).
2. Completar: Título (ej.: «El secreto del valle»), ISBN (ej.:
   `978-950-000-007-3`), Precio (ej.: `12500`), Editorial (ej.: «Editorial
   Cordillera»), Género (ej.: «Novela» o «Sin clasificar») y marcar al menos
   un autor.
3. Hacer clic en «Agregar libro».
4. Verificar: mensaje «Libro … dado de alta con el id LI-7», la fila nueva en
   la tabla «Libros cargados» y el catálogo actualizado sin recargar (si hay
   una búsqueda activa que no coincide con el título nuevo, el catálogo
   respeta el filtro).
5. Para probar validaciones: vaciar campos o repetir un ISBN existente y
   reenviar; deben listarse todos los errores juntos arriba de la tabla.

### Alta de un cliente

1. Ir a la sección «Clientes» (`index.html#clientes`).
2. Completar Nombre completo (ej.: «Diego Molina») y Email (ej.:
   `diego.molina@ejemplo.com`).
3. Hacer clic en «Agregar cliente».
4. Verificar: mensaje «Cliente … dado de alta con el id CL-4» y la fila nueva
   en la tabla «Clientes cargados».
5. Para probar validaciones: usar un email existente en mayúsculas (ej.:
   `ANA.GOMEZ@EJEMPLO.COM`) o con formato inválido (ej.: `ana@sin-dominio`);
   deben listarse los errores y no agregar el cliente.

## Verificación de los casos del Ejercicio 4

Verificación real del **16/10/2026** con **Chrome headless 155.0.8059.84**
(abierto con `file://`, sin servidor ni npm) controlado por **CDP**: los
formularios se completaron con `Runtime.evaluate` y el envío se disparó con
`form.requestSubmit()` (equivale al clic en el botón); el teclado se probó con
`Input.dispatchKeyEvent` y los anchos con `Emulation.setDeviceMetricsOverride`.
Estado inicial observado: 6 libros, 3 clientes, 6 tarjetas de catálogo y
consola sin errores.

| Caso | Qué se espera observar | Resultado |
|------|------------------------|-----------|
| ISBN duplicado (igual al de un libro existente) | No se agrega; el `role="alert"` lista «El ISBN ya está registrado…» y no aparece fila nueva | Aprobado: se rechazó con «El ISBN ya está registrado: al comparar se ignoran espacios, guiones y mayúsculas.», `aria-invalid` en `libro-isbn` y listado sin cambios (6 → 6 filas) |
| ISBN nuevo con espacios o guiones distinto pero igual normalizado | Se rechaza: la comparación ignora espacios, guiones y mayúsculas | Aprobado: `978 950 000 001 1` y `9789500000011` (mismos dígitos que LI-1) mostraron el mismo mensaje exacto y el listado quedó en 6 filas |
| Email inválido (sin `@` o sin dominio) | No se agrega; error «El email no tiene un formato válido…» | Aprobado: `ana@sin-dominio` y `no-es-un-email` mostraron «El email no tiene un formato válido (ejemplo: nombre@dominio.com).»; 3 filas sin cambios |
| Email existente escrito en mayúsculas o con espacios | Se rechaza: la comparación usa `trim()` + minúsculas | Aprobado: `ANA.GOMEZ@EJEMPLO.COM` mostró «El email ya está registrado: al comparar se ignoran espacios y mayúsculas.»; sigue en 3 clientes |
| Email nuevo con formato válido | Se agrega como `CL-n` con mensaje de éxito y fila en la tabla | Aprobado: «Cliente «Diego Rivas» dado de alta con el id CL-4.», 4.ª fila `CL-4 · Diego Rivas · diego.rivas@ejemplo.com` y formulario limpio tras el alta |
| Libro sin autores | No se agrega; error «Debe seleccionar al menos un autor» y `aria-invalid` en las casillas | Aprobado: «Debe seleccionar al menos un autor.», `aria-invalid` en `libro-autor-AU-1/2/3` y sin fila nueva (7 → 7) |
| Precio 0 o negativo | No se agrega; error «El precio debe ser un número mayor que cero» | Aprobado: con `0` y con `-5` se mostró «El precio debe ser un número mayor que cero (ejemplo: 1200 o 1200.5).»; sin fila nueva |
| Editorial vacía (sin seleccionar) | No se agrega; error «Debe seleccionar una editorial» | Aprobado: «Debe seleccionar una editorial.»; sin fila nueva |
| Foco y teclado | Tab recorre formulario y botones con foco visible; Enter en un campo envía sin recargar | Aprobado: desde la carga limpia, Tab llevó skip-link → marca → nav (Catálogo, Libros, Clientes) → buscador → sus botones → campos y casillas del formulario de libros → sus botones → formulario de clientes; todos con `:focus-visible` y `outline: 3px solid rgb(31, 95, 191)`. Enter en `#libro-titulo` disparó el envío (apareció el error de ISBN duplicado) sin recargar |
| 320 px y 1280 px | Sin scroll horizontal de la página; la tabla se desplaza dentro de su contenedor | Aprobado: a 320 px, `innerWidth=320` y `scrollWidth` de `html` y `body`=305 px (igual al `clientWidth`, por la barra vertical de 15 px) en Catálogo, Libros y Clientes; la tabla de Libros mide 589 px dentro de un `.table-wrap` de 273 px con `overflow-x: auto` (Clientes: 313 px > 273 px, también absorbido). A 1280 px, `scrollWidth`=1265 px y ambas tablas 1168 px = 1168 px (sin desborde) |
| ISBN nuevo con escritura distinta (aceptado) | Se da de alta como LI-7 y aparece en el listado y en el catálogo | Aprobado: ` 978 950 000 007 0 ` (con bordes) entró como LI-7 con «Libro «El secreto del valle» dado de alta con el id LI-7.»; 7.ª fila con ISBN «978 950 000 007 0» y 7 tarjetas en el catálogo |
| Título vacío | No se agrega; error «El título es obligatorio» | Aprobado: «El título es obligatorio.» y `aria-invalid` en `libro-titulo` |
| ISBN vacío | No se agrega; error «El ISBN es obligatorio» | Aprobado: «El ISBN es obligatorio.» y `aria-invalid` en `libro-isbn` |
| Nombre de cliente vacío | No se agrega; error «El nombre completo es obligatorio» | Aprobado: «El nombre completo es obligatorio.» y `aria-invalid` en `cliente-nombre` |
| Envíos sin recarga (`preventDefault`) | Ningún envío recarga la página | Aprobado: `window.__marca = 1` siguió existiendo tras los 16 envíos (15 con `requestSubmit()` y 1 con Enter) y `location.href` no cambió (el único evento de navegación tipo «reload» del registro fue el `Page.reload` inicial de la herramienta de verificación, no un envío del formulario) |
| Consola del navegador | Sin errores ni advertencias | Aprobado: 0 errores y 0 advertencias, incluida la carga inicial capturada con los dominios `Runtime` y `Log` de CDP |

## Pruebas opcionales de desarrollo de E5

Abrir el frontend no requiere Node ni estas pruebas. Si Node está disponible,
desde la raíz del repositorio se puede ejecutar:

```powershell
node --test tests/*.test.cjs
```

La suite usa sólo módulos incorporados (`node:test`, `assert`, `fs`, `vm`).
Se registraron **17/17 pruebas aprobadas** durante la implementación: baseline
E3/E4 (5), cantidades/importes (3), borrador (2), confirmación/snapshots (3),
contratos HTML (2) y coordinación de altas (2). Los datos de prueba están
separados en VM y no reemplazan los seis libros ni tres clientes iniciales.

Se aplicaron ciclos RED/GREEN y triangulación; su evidencia por tarea y los
límites del arnés se encuentran en
`openspec/changes/archive/2026-10-21-e5-venta-simulada-historial/validation.md`. Las pruebas VM y
los contratos HTML no acreditan por sí solos teclado, presentación ni el
funcionamiento real con `file://`; la validación de navegador se informa aparte.

## Validación real de E5 (19/10/2026)

Un validador independiente ejecutó **43/43 casos aprobados** en Chromium
151.0.7922.34 headless abriendo `index.html` por `file://`, **15/15 regresiones
E3/E4** y **17/17 pruebas nativas** finales. No hubo errores/advertencias de
consola ni solicitudes externas.

Se verificaron la fixture 1500×2 + 2000×1 = **5000,00**, cantidades/ids inválidos,
duplicados, editar/quitar, confirmación y limpieza, LI-7/CL-4 sin perder el
borrador, snapshots tras cambiar catálogo/cliente y una segunda venta con otro
id. También texto HTML literal, Tab/Enter, labels, errores accesibles, foco
visible y recarga que restaura seis libros/tres clientes/sin ventas.
El redondeo 10.075 dio **10,08** y el extremo seguro de centavos conservó el
sufijo **,91** en borrador e historial.

A 320/1280 px las medidas y capturas inspeccionadas mostraron la página sin
desborde horizontal; las tablas anchas se desplazan dentro de su contenedor.
A 320 px hay que desplazar cada tabla para consultar todas sus columnas.

Evidencia y detalle: `openspec/changes/archive/2026-10-21-e5-venta-simulada-historial/validation.md`,
`browser-aceptacion.json` y `browser-regresion.json` del mismo cambio. Los casos
browser se automatizaron con herramientas existentes del entorno; no se agregó
una dependencia al proyecto. Otros motores y lectores de pantalla no fueron
verificados.

## Ejercicio 6 · Persistencia local

La librería guarda sus colecciones mutables de libros, clientes y ventas en
`localStorage`. No se usa servidor, API, cuenta de usuario ni sincronización:
los datos pertenecen exclusivamente al **navegador**, **perfil** y **origen**
desde el que se abre esta página. Por eso no aparecen en otro navegador, otro
perfil ni para otra persona que use el mismo equipo.

### Clave y estructura

La clave es `paginas-del-sol.estado.v1`. Su valor es un JSON versionado con
esta forma:

```json
{
  "version": 1,
  "libros": ["..."],
  "clientes": ["..."],
  "ventas": ["..."]
}
```

El catálogo persistido está en `libros` dentro de esa clave. La primera apertura
crea una copia de los seis libros y tres clientes de ejemplo junto con un
historial vacío. Las aperturas posteriores restauran esa misma estructura: no
vuelven a agregar semillas ni reemplazan altas o ventas previas. Para reiniciar
la práctica, eliminá la clave desde las herramientas de almacenamiento del
navegador y recargá `index.html`.

Las altas válidas y las ventas confirmadas guardan el sobre completo. Los
borradores y los envíos inválidos no se persisten. Si el navegador bloquea o
agota `localStorage`, la operación sigue disponible durante la sesión, pero la
interfaz muestra un mensaje textual indicando que no se pudo guardar.

### Precio histórico

Cada venta conserva snapshots de cliente y renglones, incluidos
`precioUnitarioCentavos`, `subtotalCentavos` y `totalCentavos`. Para reproducir
la prueba pedagógica:

1. Confirmá una venta con un libro de $ 1500 × 2 y otro de $ 2000 × 1.
2. En la clave indicada, modificá **solo** `libros[n].precio` del catálogo.
3. Recargá la página y abrí el detalle de la venta.
4. La venta debe seguir mostrando subtotales $ 3000,00 y $ 2000,00, y total
   $ 5000,00, aunque el catálogo muestre el precio modificado.

Ese procedimiento se verificó en navegador el 21/10/2026 (caso «Precio
histórico» de la sección siguiente).

### Evidencia automatizada E6

La suite CJS se ejecutó el 21/10/2026 con:

```powershell
node --test tests/*.test.cjs
```

Resultado: **22/22 pruebas aprobadas**, sin dependencias externas. Las cinco
pruebas de `tests/persistencia.test.cjs` comprobaron: primera carga, restauración
válida, recuperación de JSON inválido, recarga sin duplicar semillas, altas de
libro/cliente, venta de $ 5000,00 y precio histórico tras modificar únicamente
el catálogo persistido. Las 17 pruebas E3-E5 existentes también se mantuvieron
verdes. La suite no sustituye la comprobación en navegador: esa validación de
navegador se registra en la sección siguiente.

### Casos manuales E6 (verificados el 21/10/2026)

La verificación se ejecutó el **21/10/2026** con **Chrome headless
156.0.8078.47** controlado por **CDP** sobre `file://` (sin servidor ni npm),
con un **perfil aislado** del navegador. El baseline
`node --test tests/*.test.cjs` previo a la sesión, con Node 22, fue **22/22**.
`localStorage` resultó disponible en `file://` y persistente tras
`Page.reload` (JSON idéntico de 1180 caracteres). La evidencia completa de la
sesión quedó en
`openspec/changes/archive/2026-10-21-e6-persistencia-localstorage-pruebas/browser-persistencia-e6.json`.

| Caso | Resultado esperado | Resultado observado |
|------|--------------------|---------------------|
| Búsqueda | Mayúsculas/minúsculas, vacía e inexistente conservan el comportamiento E3 | `"  VIEN "` → «1 libro coincide con «VIEN».» (1 coincidencia); vacía → 6 tarjetas («Mostrando los 6 libros del catálogo.»); «zzz inexistente» → 0 tarjetas con «Sin resultados: ningún título contiene «zzz inexistente». Probá con otra palabra o borrá la búsqueda.»; mismo comportamiento tras recarga |
| ISBN | Duplicado rechazado y alta válida persistida tras recargar | Duplicado `978-950-000-001-1` rechazado («El ISBN ya está registrado: al comparar se ignoran espacios, guiones y mayúsculas.», sigue en 6 filas); altas válidas «Prueba E6» (` 978 950 000 009 7 `, precio 1500) → **LI-7** y «Prueba E6 B» (2000) → **LI-8**; tras recarga: 8 filas LI-1…LI-8 en DOM y storage |
| Email | Inválido y duplicado sin importar mayúsculas rechazados; alta válida persistida | `ana@sin-dominio` rechazado («El email no tiene un formato válido (ejemplo: nombre@dominio.com).»); `ANA.GOMEZ@EJEMPLO.COM` rechazado («El email ya está registrado: al comparar se ignoran espacios y mayúsculas.»); «Prueba E6 Cliente» (`prueba.e6@ejemplo.com`) → **CL-4**, persistido tras recarga (4 filas) |
| Venta inválida | No agrega ni guarda ventas con cliente/libro/cantidad inválidos o duplicados | Sin cliente / sin renglones → «Debe seleccionar un cliente existente.» / «Agregá al menos un libro a la venta.»; cantidades 0 / −2 / 1.5 → «Renglón 1: la cantidad debe ser un entero mayor que cero y seguro.» (`aria-invalid`); libro repetido → «Renglón 2: el libro ya está en la venta; modificá su cantidad.»; tras recarga: 0 ventas, historial vacío |
| Venta válida | $ 1500 × 2 + $ 2000 × 1 conserva subtotales $ 3000/$ 2000 y total $ 5000 | LI-7×2 ($ 1.500,00 → $ 3.000,00) + LI-8×1 ($ 2.000,00 → $ 2.000,00), total **$ 5.000,00**; «Venta **VE-1** confirmada por $ 5.000,00. Podés consultar su detalle en Historial o iniciar otra venta.»; fila «VE-1 \| 21/10/2026, 10:45:33 \| Ana Gómez \| $ 5.000,00 \| Ver detalle»; persiste tras recarga (`totalCentavos` 500000) |
| Recarga | No duplica los seis libros ni los tres clientes iniciales | 8 libros LI-1…LI-8 únicos y 4 clientes CL-1…CL-4 únicos (semillas sin duplicar, altas presentes); VE-1 en historial; el borrador no se persiste (claves storage: `version`, `libros`, `clientes`, `ventas`) |
| Precio histórico | Sigue el procedimiento anterior y conserva los importes históricos | Modificando **sólo** `libros[].precio` en el storage (LI-7→9999, LI-8→8888), el catálogo tras recarga muestra **$ 9.999,00** y **$ 8.888,00**; el detalle de VE-1 conserva LI-7 c=2 **$ 1.500,00 / $ 3.000,00**, LI-8 c=1 **$ 2.000,00 / $ 2.000,00** y **Total: $ 5.000,00** (storage de la venta intacto) |
| Accesibilidad y tamaños | Tab/foco visible y 320/1280 px sin desplazamiento horizontal de página | Tab con 16/16 paradas focales visibles (`:focus-visible`, outline 3px); **320 px**: `scrollWidth 305 = clientWidth 305` en las 5 vistas (#catalogo, #libros, #clientes, #ventas, #historial), los `.table-wrap` absorben el desborde (wrap 273 vs tabla 588 px); **1280 px**: `scrollWidth 1265 = clientWidth 1265` en las 5 vistas |
| Extra · Inicialización | La primera apertura crea la clave con las semillas | Primera apertura en perfil nuevo crea `paginas-del-sol.estado.v1` con 6 libros, 3 clientes y 0 ventas |
| Extra · Reinicio | Borrar la clave y recargar restaura las semillas | `removeItem` + recarga restaura 6 libros, 3 clientes y 0 ventas |
| Extra · Consola y red | Consola sin errores ni advertencias y sin solicitudes externas | 0 errores / 0 advertencias; 130 solicitudes, todas `file://`, 0 externas |

El caso de precio histórico se replicó **siguiendo el procedimiento de la
consigna** (modificar sólo el precio del catálogo persistido y recargar). La
comprobación guiada por el docente en una copia del proyecto sigue siendo
parte de la entrega; el comportamiento observado coincide con lo pedido.
