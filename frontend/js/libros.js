/*
 * Alta de libros contra la API (Global · Ejercicio 2 · change C-02).
 *
 * Responsabilidades:
 *   - Cargar las opciones desde la API (DD-01): editoriales, géneros y autores
 *     con GET /editoriales/, GET /generos/ y GET /autores/.
 *   - Armar las autorías: cada autor se marca en la lista, se elige su rol y el
 *     orden es el orden en que se marcó (1, 2, 3…). Al marcarlo se verifica con
 *     GET /autores/{id} que siga existiendo.
 *   - Validar el formulario y mostrar todos los errores juntos, cerca de él.
 *   - Enviar POST /libros/ y, con el 201, usar el registro devuelto para
 *     actualizar la tabla y avisar al resto de la página.
 *   - Ante un 409 o un 422, mostrar el mensaje del servidor y conservar todo lo
 *     cargado (RN-UI-01).
 *
 * La unicidad del ISBN y la existencia de editorial, género y autores las
 * decide la base (DD-04): acá no se consulta antes, se muestra lo que responde
 * la API.
 */

const ROLES_AUTORIA = ["autor", "coautor", "traductor", "ilustrador"];

/* Mismas reglas que el contrato LibroCreate del backend. */
const ISBN_PATRON = /^[0-9][0-9-]{8,15}[0-9Xx]$/;
const PRECIO_PATRON = /^\d{1,8}(\.\d{1,2})?$/;
const ENTERO_PATRON = /^\d+$/;
const MAX_ID = 2147483647;
const MAX_AUTORIAS = 100;
const LIMITE_OPCIONES = 100;

const CAMPOS_BASE_LIBRO = [
  "libro-titulo",
  "libro-isbn",
  "libro-precio",
  "libro-stock",
  "libro-editorial",
  "libro-genero",
];

/* Estado del formulario que no vive en un único <input>. */
let autoresDisponibles = []; // Respuesta de GET /autores/.
let autoriasLibro = []; // [{ autor_id, nombre, rol }] en el orden en que se marcaron.
let librosCargados = []; // Registros devueltos por la API, para la tabla.

const idCasillaAutor = (autorId) => `libro-autor-${autorId}`;

/** Campos que reciben aria-invalid: los fijos más una casilla por autor. */
function camposLibro() {
  return [...CAMPOS_BASE_LIBRO, ...autoresDisponibles.map((autor) => idCasillaAutor(autor.id))];
}

/* ---------- Lectura y validación (sin DOM: se prueban en Node) ---------- */

/** Lee y recorta los valores del formulario de libros. */
function leerDatosLibro(formulario) {
  const datos = new FormData(formulario);
  return {
    titulo: String(datos.get("titulo") ?? "").trim(),
    isbn: String(datos.get("isbn") ?? "").trim(),
    precioTexto: String(datos.get("precio") ?? "").trim(),
    stockTexto: String(datos.get("stock") ?? "").trim(),
    editorialId: String(datos.get("editorialId") ?? ""),
    generoId: String(datos.get("generoId") ?? ""),
  };
}

/** Devuelve el id como entero si el texto es un id válido (1 a MAX_ID); si no, null. */
function leerIdEntero(texto) {
  const limpio = String(texto ?? "").trim();
  if (!ENTERO_PATRON.test(limpio)) return null;
  const numero = Number(limpio);
  return numero >= 1 && numero <= MAX_ID ? numero : null;
}

/**
 * Valida todos los campos del libro y sus autorías. Devuelve la lista completa
 * de errores (para el contenedor role="alert") y los ids de campos inválidos
 * (para aria-invalid). Si la lista está vacía, se puede enviar.
 */
function validarDatosLibro(datos, autorias) {
  const errores = [];
  const camposInvalidos = new Set();

  if (datos.titulo === "") {
    errores.push("El título es obligatorio.");
    camposInvalidos.add("libro-titulo");
  } else if (datos.titulo.length > 200) {
    errores.push("El título admite hasta 200 caracteres.");
    camposInvalidos.add("libro-titulo");
  }

  if (datos.isbn === "") {
    errores.push("El ISBN es obligatorio.");
    camposInvalidos.add("libro-isbn");
  } else if (!ISBN_PATRON.test(datos.isbn)) {
    errores.push("El ISBN debe tener entre 10 y 17 caracteres: solo dígitos y guiones (el último puede ser X).");
    camposInvalidos.add("libro-isbn");
  }

  if (datos.precioTexto === "") {
    errores.push("El precio es obligatorio.");
    camposInvalidos.add("libro-precio");
  } else if (!PRECIO_PATRON.test(datos.precioTexto) || Number(datos.precioTexto) <= 0) {
    errores.push("El precio debe ser mayor que cero, con hasta 2 decimales (ejemplo: 1200 o 1200.50).");
    camposInvalidos.add("libro-precio");
  }

  if (datos.stockTexto === "") {
    errores.push("El stock es obligatorio (puede ser 0).");
    camposInvalidos.add("libro-stock");
  } else if (!ENTERO_PATRON.test(datos.stockTexto) || Number(datos.stockTexto) > MAX_ID) {
    errores.push("El stock debe ser un número entero desde cero.");
    camposInvalidos.add("libro-stock");
  }

  if (leerIdEntero(datos.editorialId) === null) {
    errores.push("Debe seleccionar una editorial.");
    camposInvalidos.add("libro-editorial");
  }

  if (datos.generoId !== "" && leerIdEntero(datos.generoId) === null) {
    errores.push("El género seleccionado no es válido.");
    camposInvalidos.add("libro-genero");
  }

  if (autorias.length === 0) {
    errores.push("Debe marcar al menos un autor.");
    camposInvalidos.add("libro-autores");
  } else {
    const ids = autorias.map((autoria) => autoria.autor_id);
    if (new Set(ids).size !== ids.length) {
      errores.push("Un mismo autor no puede figurar dos veces en el libro.");
      camposInvalidos.add("libro-autores");
    }
    if (autorias.some((autoria) => !ROLES_AUTORIA.includes(autoria.rol))) {
      errores.push("El rol de cada autoría debe ser autor, coautor, traductor o ilustrador.");
    }
  }

  return { errores, camposInvalidos };
}

/**
 * Cuerpo de POST /libros/. El precio viaja como texto decimal ("1200.50") para
 * no perder centavos; el orden de cada autoría es su posición en la lista.
 */
function construirCuerpoLibro(datos, autorias) {
  return {
    titulo: datos.titulo,
    isbn: datos.isbn,
    precio: datos.precioTexto,
    stock: Number(datos.stockTexto),
    editorial_id: Number(datos.editorialId),
    genero_id: datos.generoId === "" ? null : Number(datos.generoId),
    autores: autorias.map((autoria, indice) => ({
      autor_id: autoria.autor_id,
      rol: autoria.rol,
      orden: indice + 1,
    })),
  };
}

/** Motivo por el que no se puede agregar la autoría, o null si se puede. */
function motivoRechazoAutoria(autorias, autorId, rol) {
  if (autorias.some((autoria) => autoria.autor_id === autorId)) {
    return "Ese autor ya está marcado en el libro.";
  }
  if (!ROLES_AUTORIA.includes(rol)) {
    return "Elegí un rol: autor, coautor, traductor o ilustrador.";
  }
  if (autorias.length >= MAX_AUTORIAS) {
    return `Un libro admite hasta ${MAX_AUTORIAS} autorías.`;
  }
  return null;
}

/** "Julio Cortázar (autor), Ana Ruiz (traductor)" a partir del detalle de la API. */
function describirAutorias(autores) {
  return [...autores]
    .sort((a, b) => a.orden - b.orden)
    .map((autoria) => `${autoria.nombre} (${autoria.rol})`)
    .join(", ");
}

/* ---------- Opciones de editorial y género ---------- */

function completarSelect(select, textoInicial, inicialDeshabilitada, lista) {
  const inicial = document.createElement("option");
  inicial.value = "";
  inicial.textContent = textoInicial;
  inicial.disabled = inicialDeshabilitada;
  inicial.selected = true;
  const opciones = lista.map((item) => {
    const opcion = document.createElement("option");
    opcion.value = String(item.id);
    opcion.textContent = item.nombre;
    return opcion;
  });
  select.replaceChildren(inicial, ...opciones);
}

/** Carga editoriales y géneros desde la API. Devuelve los mensajes de error (vacío si salió bien). */
async function cargarOpcionesLibro() {
  const selectEditorial = document.getElementById("libro-editorial");
  const selectGenero = document.getElementById("libro-genero");
  const parametros = { limit: LIMITE_OPCIONES, offset: 0 };
  const errores = [];

  const [editoriales, generos, autores] = await Promise.allSettled([
    apiFetch("/editoriales/", { parametros }),
    apiFetch("/generos/", { parametros }),
    apiFetch("/autores/", { parametros }),
  ]);

  if (editoriales.status === "fulfilled") {
    completarSelect(selectEditorial, "Seleccione una editorial…", true, editoriales.value.datos);
  } else {
    completarSelect(selectEditorial, "No se pudieron cargar las editoriales", true, []);
    errores.push(...mensajesDeError(editoriales.reason).map((texto) => `Editoriales: ${texto}`));
  }

  if (generos.status === "fulfilled") {
    completarSelect(selectGenero, SIN_CLASIFICAR, false, generos.value.datos);
  } else {
    completarSelect(selectGenero, SIN_CLASIFICAR, false, []);
    errores.push(...mensajesDeError(generos.reason).map((texto) => `Géneros: ${texto}`));
  }

  if (autores.status === "fulfilled") {
    autoresDisponibles = autores.value.datos;
  } else {
    autoresDisponibles = [];
    errores.push(...mensajesDeError(autores.reason).map((texto) => `Autores: ${texto}`));
  }
  renderizarAutoresLibro();

  return errores;
}

/* ---------- Autorías ---------- */

function mostrarResultadoAutor(texto, tono) {
  const resultado = document.getElementById("libro-autor-resultado");
  limpiarMensaje(resultado);
  resultado.textContent = texto;
  if (tono) resultado.classList.add(tono);
}

/** Dibuja una fila por autor del listado: casilla, rol y orden asignado. */
function renderizarAutoresLibro() {
  const contenedor = document.getElementById("libro-autores");
  const vacio = document.getElementById("libro-autores-vacio");

  const filas = autoresDisponibles.map((autor) => {
    const fila = document.createElement("li");
    fila.className = "autor-opcion";
    fila.dataset.autorId = String(autor.id);

    const etiqueta = document.createElement("label");
    etiqueta.className = "check-opcion";
    const casilla = document.createElement("input");
    casilla.type = "checkbox";
    casilla.id = idCasillaAutor(autor.id);
    casilla.value = String(autor.id);
    casilla.setAttribute("aria-describedby", "libro-autores-ayuda libro-autor-resultado");
    const nombre = document.createElement("span");
    nombre.textContent = `${autor.nombre} (${autor.nacionalidad})`;
    etiqueta.htmlFor = casilla.id;
    etiqueta.append(casilla, nombre);

    const etiquetaRol = document.createElement("label");
    etiquetaRol.className = "visualmente-oculto";
    etiquetaRol.htmlFor = `libro-autor-rol-${autor.id}`;
    etiquetaRol.textContent = `Rol de ${autor.nombre}`;
    const rol = document.createElement("select");
    rol.id = etiquetaRol.htmlFor;
    rol.className = "input autor-rol";
    ROLES_AUTORIA.forEach((valor) => {
      const opcion = document.createElement("option");
      opcion.value = valor;
      opcion.textContent = valor.charAt(0).toUpperCase() + valor.slice(1);
      rol.append(opcion);
    });

    const orden = document.createElement("span");
    orden.className = "autor-orden";

    casilla.addEventListener("change", () => alternarAutor(autor, casilla.checked, rol.value));
    rol.addEventListener("change", () => {
      const autoria = autoriasLibro.find((item) => item.autor_id === autor.id);
      if (autoria) autoria.rol = rol.value;
    });

    fila.append(etiqueta, etiquetaRol, rol, orden);
    return fila;
  });

  contenedor.replaceChildren(...filas);
  vacio.hidden = filas.length > 0;
  actualizarEstadoAutores();
}

/** Sincroniza casillas, roles y números de orden con autoriasLibro sin redibujar. */
function actualizarEstadoAutores() {
  document.querySelectorAll("#libro-autores .autor-opcion").forEach((fila) => {
    const autorId = Number(fila.dataset.autorId);
    const indice = autoriasLibro.findIndex((autoria) => autoria.autor_id === autorId);
    const marcado = indice !== -1;
    fila.querySelector('input[type="checkbox"]').checked = marcado;
    const rol = fila.querySelector(".autor-rol");
    rol.disabled = !marcado;
    if (marcado) rol.value = autoriasLibro[indice].rol;
    fila.querySelector(".autor-orden").textContent = marcado ? `Orden ${indice + 1}` : "";
  });
}

/**
 * Marca o desmarca un autor. Al marcarlo se verifica con GET /autores/{id}
 * (DD-01: verificación puntual) antes de sumarlo a las autorías.
 */
async function alternarAutor(autor, marcado, rol) {
  if (!marcado) {
    autoriasLibro = autoriasLibro.filter((autoria) => autoria.autor_id !== autor.id);
    mostrarResultadoAutor("", null);
    actualizarEstadoAutores();
    return;
  }

  const casilla = document.getElementById(idCasillaAutor(autor.id));
  casilla.disabled = true;
  try {
    const { datos } = await apiFetch(`/autores/${autor.id}`);
    const motivo = motivoRechazoAutoria(autoriasLibro, datos.id, rol);
    if (motivo) {
      mostrarResultadoAutor(motivo, "message--warning");
    } else {
      autoriasLibro.push({ autor_id: datos.id, nombre: datos.nombre, rol });
      mostrarResultadoAutor(`${datos.nombre} agregado con el orden ${autoriasLibro.length}.`, "message--info");
    }
  } catch (error) {
    const mensajes = error instanceof ErrorApi && error.status === 404
      ? [`${autor.nombre} ya no existe en la base: actualizá la página para ver los autores vigentes.`]
      : mensajesDeError(error);
    mostrarResultadoAutor(mensajes.join(" "), "message--warning");
  } finally {
    casilla.disabled = false;
    actualizarEstadoAutores();
  }
}

/** Vacía las autorías (después de un 201 o al limpiar el formulario). */
function limpiarAutoriasLibro() {
  autoriasLibro = [];
  mostrarResultadoAutor("", null);
  actualizarEstadoAutores();
}

/* ---------- Tabla de libros (datos de la API) ---------- */

function renderizarTablaLibros() {
  const cuerpo = document.getElementById("libros-cuerpo");
  const mensajeVacio = document.getElementById("libros-vacio");

  const filas = librosCargados.map((libro) => {
    const fila = document.createElement("tr");
    fila.append(
      crearCeldaTabla(libro.id),
      crearCeldaTabla(libro.titulo),
      crearCeldaTabla(libro.isbn),
      crearCeldaTabla(formatoPrecio.format(Number(libro.precio))),
      crearCeldaTabla(libro.stock),
      crearCeldaTabla(libro.editorial ? libro.editorial.nombre : "Editorial desconocida"),
      crearCeldaTabla(libro.genero ? libro.genero.nombre : SIN_CLASIFICAR)
    );
    return fila;
  });

  cuerpo.replaceChildren(...filas);
  mensajeVacio.hidden = librosCargados.length > 0;
}

/** Trae el listado inicial de la tabla. Devuelve los mensajes de error (vacío si salió bien). */
async function cargarTablaLibros() {
  try {
    const { datos } = await apiFetch("/libros/", { parametros: { limit: LIMITE_OPCIONES, offset: 0 } });
    librosCargados = datos;
    renderizarTablaLibros();
    return [];
  } catch (error) {
    return mensajesDeError(error).map((texto) => `Listado de libros: ${texto}`);
  }
}

/* ---------- Eventos ---------- */

async function enviarAltaLibro(formulario) {
  const contenedorErrores = document.getElementById("libros-errores");
  const mensajeResultado = document.getElementById("libros-mensaje");
  const botonEnviar = document.getElementById("libro-enviar");

  contenedorErrores.replaceChildren();
  limpiarMensaje(mensajeResultado);

  const datos = leerDatosLibro(formulario);
  const { errores, camposInvalidos } = validarDatosLibro(datos, autoriasLibro);
  if (camposInvalidos.delete("libro-autores")) {
    autoresDisponibles.forEach((autor) => camposInvalidos.add(idCasillaAutor(autor.id)));
  }
  marcarAriaInvalid(camposLibro(), camposInvalidos);
  if (errores.length > 0) {
    mostrarErrores(contenedorErrores, errores);
    return;
  }

  botonEnviar.disabled = true;
  try {
    // 201: el cuerpo es el libro registrado, con editorial, género y autores.
    const { datos: libro } = await apiFetch("/libros/", {
      metodo: "POST",
      cuerpo: construirCuerpoLibro(datos, autoriasLibro),
    });

    librosCargados.push(libro);
    formulario.reset(); // También vacía las autorías (ver el listener de reset).
    mensajeResultado.classList.add("message--info");
    mensajeResultado.textContent =
      `Libro «${libro.titulo}» dado de alta con el id ${libro.id}. Autores: ${describirAutorias(libro.autores)}.`;
    renderizarTablaLibros();
    document.dispatchEvent(new CustomEvent("libros-actualizados", { detail: { libro } }));
  } catch (error) {
    // 409 (ISBN repetido, editorial/género/autor inexistente) o 422: se muestra
    // el mensaje del servidor y el formulario queda como estaba para corregir.
    mostrarErrores(contenedorErrores, mensajesDeError(error));
  } finally {
    botonEnviar.disabled = false;
  }
}

async function iniciarAltaLibros() {
  const formulario = document.getElementById("form-libro");
  const contenedorErrores = document.getElementById("libros-errores");
  const mensajeResultado = document.getElementById("libros-mensaje");

  renderizarAutoresLibro();
  renderizarTablaLibros();

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    enviarAltaLibro(formulario);
  });

  formulario.addEventListener("reset", () => {
    contenedorErrores.replaceChildren();
    limpiarMensaje(mensajeResultado);
    marcarAriaInvalid(camposLibro(), new Set());
    limpiarAutoriasLibro();
    document.getElementById("libro-titulo").focus();
  });

  const [erroresOpciones, erroresTabla] = await Promise.all([cargarOpcionesLibro(), cargarTablaLibros()]);
  const erroresCarga = [...erroresOpciones, ...erroresTabla];
  if (erroresCarga.length > 0) {
    mostrarErrores(contenedorErrores, erroresCarga);
  }
}

document.addEventListener("DOMContentLoaded", iniciarAltaLibros);
