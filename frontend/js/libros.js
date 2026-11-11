/*
 * Alta de libros (Ejercicio 4).
 *
 * Responsabilidades:
 *   - Generar las opciones de editorial, género y autores desde los datos,
 *     con createElement + textContent.
 *   - Validar el formulario completo y mostrar todos los errores juntos.
 *   - Asignar el id siguiente (LI-7, LI-8…) con el mayor sufijo existente.
 *   - Actualizar la tabla de libros y refrescar el catálogo (Ejercicio 3)
 *     reutilizando renderizarCatalogo + filtrarPorTitulo sin recargar.
 *
 * Los autores se presentan con checkboxes (y no con select multiple) porque
 * son pocas opciones que se ven todas a la vez: se alternan con un clic,
 * no hace falta recordar atajos de teclado, y el grupo se agrupa con
 * fieldset/legend para que el significado quede claro.
 */

/** Quita espacios y guiones y pasa a minúsculas: dos ISBN son iguales si
 * coinciden en esta forma normalizada. */
function normalizarIsbn(isbn) {
  return isbn.replace(/[\s-]/g, "").toLocaleLowerCase("es");
}

/** Completa los selects y el grupo de checkboxes del formulario de libros. */
function prepararFormularioLibro() {
  const selectEditorial = document.getElementById("libro-editorial");
  const selectGenero = document.getElementById("libro-genero");
  const contenedorAutores = document.getElementById("libro-autores");

  const opcionEditorialPorDefecto = document.createElement("option");
  opcionEditorialPorDefecto.value = "";
  opcionEditorialPorDefecto.textContent = "Seleccione una editorial…";
  opcionEditorialPorDefecto.disabled = true;
  opcionEditorialPorDefecto.selected = true;
  selectEditorial.append(opcionEditorialPorDefecto);
  EDITORIALES.forEach((editorial) => {
    const opcion = document.createElement("option");
    opcion.value = editorial.id;
    opcion.textContent = editorial.nombre;
    selectEditorial.append(opcion);
  });

  const opcionSinGenero = document.createElement("option");
  opcionSinGenero.value = "";
  opcionSinGenero.textContent = SIN_CLASIFICAR;
  selectGenero.append(opcionSinGenero);
  GENEROS.forEach((genero) => {
    const opcion = document.createElement("option");
    opcion.value = genero.id;
    opcion.textContent = genero.nombre;
    selectGenero.append(opcion);
  });

  AUTORES.forEach((autor) => {
    const idCasilla = `libro-autor-${autor.id}`;

    const etiqueta = document.createElement("label");
    etiqueta.className = "check-opcion";
    etiqueta.setAttribute("for", idCasilla);

    const casilla = document.createElement("input");
    casilla.type = "checkbox";
    casilla.id = idCasilla;
    casilla.name = "autorIds";
    casilla.value = autor.id;

    const nombre = document.createElement("span");
    nombre.textContent = autor.nombre;

    etiqueta.append(casilla, nombre);
    contenedorAutores.append(etiqueta);
  });
}

/** Lee y recorta los valores del formulario de libros. */
function leerDatosLibro(formulario) {
  const datos = new FormData(formulario);
  return {
    titulo: String(datos.get("titulo") ?? "").trim(),
    isbn: String(datos.get("isbn") ?? "").trim(),
    precioTexto: String(datos.get("precio") ?? "").trim(),
    editorialId: String(datos.get("editorialId") ?? ""),
    generoId: String(datos.get("generoId") ?? ""),
    autorIds: datos.getAll("autorIds").map(String),
  };
}

/**
 * Valida todos los campos del libro. Devuelve la lista completa de errores
 * (para el contenedor role="alert") y los ids de campos inválidos (para
 * aria-invalid). Si la lista de errores está vacía, se puede dar de alta.
 */
function validarDatosLibro(datos) {
  const errores = [];
  const camposInvalidos = new Set();
  const idsAutores = AUTORES.map((autor) => `libro-autor-${autor.id}`);

  if (datos.titulo === "") {
    errores.push("El título es obligatorio.");
    camposInvalidos.add("libro-titulo");
  }

  if (datos.isbn === "") {
    errores.push("El ISBN es obligatorio.");
    camposInvalidos.add("libro-isbn");
  } else {
    const normalizado = normalizarIsbn(datos.isbn);
    const repetido = LIBROS.some((libro) => normalizarIsbn(libro.isbn) === normalizado);
    if (repetido) {
      errores.push("El ISBN ya está registrado: al comparar se ignoran espacios, guiones y mayúsculas.");
      camposInvalidos.add("libro-isbn");
    }
  }

  if (datos.precioTexto === "") {
    errores.push("El precio es obligatorio.");
    camposInvalidos.add("libro-precio");
  } else {
    const precio = Number(datos.precioTexto);
    if (!Number.isFinite(precio) || precio <= 0) {
      errores.push("El precio debe ser un número mayor que cero (ejemplo: 1200 o 1200.5).");
      camposInvalidos.add("libro-precio");
    }
  }

  if (datos.editorialId === "" || !buscarPorId(EDITORIALES, datos.editorialId)) {
    errores.push("Debe seleccionar una editorial.");
    camposInvalidos.add("libro-editorial");
  }

  if (datos.autorIds.length === 0) {
    errores.push("Debe seleccionar al menos un autor.");
    idsAutores.forEach((id) => camposInvalidos.add(id));
  } else {
    const hayAutorDesconocido = datos.autorIds.some((id) => !buscarPorId(AUTORES, id));
    if (hayAutorDesconocido) {
      errores.push("Hay un autor seleccionado que no existe en los datos.");
      idsAutores.forEach((id) => camposInvalidos.add(id));
    }
  }

  if (datos.generoId !== "" && !buscarPorId(GENEROS, datos.generoId)) {
    errores.push("El género seleccionado no existe.");
    camposInvalidos.add("libro-genero");
  }

  return { errores, camposInvalidos };
}

/** Dibuja la tabla de libros desde LIBROS y alterna el mensaje de lista vacía. */
function renderizarTablaLibros() {
  const cuerpo = document.getElementById("libros-cuerpo");
  const mensajeVacio = document.getElementById("libros-vacio");

  const filas = LIBROS.map((libro) => {
    const editorial = buscarPorId(EDITORIALES, libro.editorialId);
    const genero = libro.generoId ? buscarPorId(GENEROS, libro.generoId) : null;
    const autores = libro.autorIds.map((id) => buscarPorId(AUTORES, id)).filter(Boolean);

    const fila = document.createElement("tr");
    fila.append(
      crearCeldaTabla(libro.id),
      crearCeldaTabla(libro.titulo),
      crearCeldaTabla(libro.isbn),
      crearCeldaTabla(formatoPrecio.format(libro.precio)),
      crearCeldaTabla(editorial ? editorial.nombre : "Editorial desconocida"),
      crearCeldaTabla(genero ? genero.nombre : SIN_CLASIFICAR),
      crearCeldaTabla(autores.map((autor) => autor.nombre).join(", "))
    );
    return fila;
  });

  cuerpo.replaceChildren(...filas);
  mensajeVacio.hidden = LIBROS.length > 0;
}

/** Vuelve a dibujar el catálogo respetando la búsqueda activa, sin recargar. */
function refrescarCatalogo() {
  const campoBusqueda = document.getElementById("busqueda-titulo");
  const listaCatalogo = document.getElementById("catalogo-lista");
  const mensajeCatalogo = document.getElementById("catalogo-mensaje");
  if (!campoBusqueda || !listaCatalogo || !mensajeCatalogo) {
    return;
  }
  const busqueda = campoBusqueda.value;
  renderizarCatalogo(filtrarPorTitulo(LIBROS, busqueda), busqueda, {
    lista: listaCatalogo,
    mensaje: mensajeCatalogo,
  });
}

function iniciarAltaLibros() {
  const formulario = document.getElementById("form-libro");
  const contenedorErrores = document.getElementById("libros-errores");
  const mensajeResultado = document.getElementById("libros-mensaje");
  const idsCampos = [
    "libro-titulo",
    "libro-isbn",
    "libro-precio",
    "libro-editorial",
    "libro-genero",
    ...AUTORES.map((autor) => `libro-autor-${autor.id}`),
  ];

  prepararFormularioLibro();
  renderizarTablaLibros();

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    contenedorErrores.replaceChildren();
    limpiarMensaje(mensajeResultado);

    const datos = leerDatosLibro(formulario);
    const { errores, camposInvalidos } = validarDatosLibro(datos);
    marcarAriaInvalid(idsCampos, camposInvalidos);

    if (errores.length > 0) {
      mostrarErrores(contenedorErrores, errores);
      return;
    }

    const libro = {
      id: siguienteIdPrefijado(LIBROS, "LI"),
      titulo: datos.titulo,
      isbn: datos.isbn,
      precio: Number(datos.precioTexto),
      editorialId: datos.editorialId,
      generoId: datos.generoId === "" ? null : datos.generoId,
      autorIds: datos.autorIds,
    };
    LIBROS.push(libro);
    const persistido = persistirEstadoBiblioteca();

    formulario.reset();
    marcarAriaInvalid(idsCampos, new Set());
    mensajeResultado.classList.add(persistido ? "message--info" : "message--warning");
    mensajeResultado.textContent = persistido
      ? `Libro «${libro.titulo}» dado de alta con el id ${libro.id}.`
      : `Libro «${libro.titulo}» dado de alta, pero no se pudo guardar en este navegador.`;
    renderizarTablaLibros();
    refrescarCatalogo();
    document.dispatchEvent(new Event("libros-actualizados"));
  });

  formulario.addEventListener("reset", () => {
    contenedorErrores.replaceChildren();
    limpiarMensaje(mensajeResultado);
    marcarAriaInvalid(idsCampos, new Set());
    document.getElementById("libro-titulo").focus();
  });
}

document.addEventListener("DOMContentLoaded", iniciarAltaLibros);
