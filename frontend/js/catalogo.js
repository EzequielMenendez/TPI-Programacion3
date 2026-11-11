/*
 * Catálogo y filtro por título (Ejercicio 3).
 *
 * Responsabilidades:
 *   - Consultas: buscar editorial, género y autores por id.
 *   - Validación de datos: comprobar que las relaciones de cada libro existan.
 *   - Filtro: normalizar la búsqueda y quedarse con los libros que coinciden.
 *   - Renderizado: crear las tarjetas del catálogo y los mensajes de estado.
 *   - Eventos: conectar el buscador con el filtro.
 *
 * Todo texto se inserta con textContent, nunca con innerHTML, para que lo que
 * escribe el usuario (y los datos) se muestren como texto.
 */

const SIN_CLASIFICAR = "Sin clasificar";

const formatoPrecio = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/* ---------- Consultas sobre los datos locales ---------- */

function buscarPorId(lista, id) {
  return lista.find((item) => item.id === id) ?? null;
}

function obtenerEditorial(libro) {
  return buscarPorId(EDITORIALES, libro.editorialId);
}

function obtenerGenero(libro) {
  return libro.generoId ? buscarPorId(GENEROS, libro.generoId) : null;
}

function obtenerAutores(libro) {
  return libro.autorIds.map((id) => buscarPorId(AUTORES, id)).filter(Boolean);
}

/* ---------- Validación de las relaciones iniciales ---------- */

/**
 * Devuelve una lista de problemas encontrados en las relaciones de los libros.
 * Una lista vacía significa que los datos son coherentes.
 */
function validarRelacionesLibros(libros) {
  const problemas = [];

  libros.forEach((libro) => {
    if (!obtenerEditorial(libro)) {
      problemas.push(`${libro.id}: la editorial ${libro.editorialId} no existe.`);
    }
    if (libro.generoId && !obtenerGenero(libro)) {
      problemas.push(`${libro.id}: el género ${libro.generoId} no existe.`);
    }
    if (!Array.isArray(libro.autorIds) || libro.autorIds.length === 0) {
      problemas.push(`${libro.id}: debe tener al menos un autor.`);
    } else {
      libro.autorIds
        .filter((id) => !buscarPorId(AUTORES, id))
        .forEach((id) => problemas.push(`${libro.id}: el autor ${id} no existe.`));
    }
  });

  return problemas;
}

/* ---------- Filtro por título ---------- */

/** Quita espacios en los extremos y pasa a minúsculas. */
function normalizarBusqueda(texto) {
  return texto.trim().toLocaleLowerCase("es");
}

/**
 * Filtra por coincidencia parcial del título, sin distinguir mayúsculas.
 * Una búsqueda vacía (o solo espacios) devuelve todo el catálogo.
 */
function filtrarPorTitulo(libros, busqueda) {
  const termino = normalizarBusqueda(busqueda);
  if (termino === "") {
    return libros;
  }
  return libros.filter((libro) =>
    libro.titulo.toLocaleLowerCase("es").includes(termino)
  );
}

/* ---------- Renderizado ---------- */

function crearDato(etiqueta, valor) {
  const contenedor = document.createElement("div");
  contenedor.className = "book-card__item";

  const dt = document.createElement("dt");
  dt.textContent = etiqueta;
  const dd = document.createElement("dd");
  dd.textContent = valor;

  contenedor.append(dt, dd);
  return contenedor;
}

function crearTarjetaLibro(libro) {
  const editorial = obtenerEditorial(libro);
  const genero = obtenerGenero(libro);
  const autores = obtenerAutores(libro);

  const item = document.createElement("li");
  const tarjeta = document.createElement("article");
  tarjeta.className = "card book-card";

  const etiquetaGenero = document.createElement("p");
  etiquetaGenero.className = genero ? "tag" : "tag tag--muted";
  etiquetaGenero.textContent = genero ? genero.nombre : SIN_CLASIFICAR;

  const titulo = document.createElement("h3");
  titulo.className = "book-card__title";
  titulo.textContent = libro.titulo;

  const datos = document.createElement("dl");
  datos.className = "book-card__data";
  datos.append(
    crearDato("ISBN", libro.isbn),
    crearDato("Editorial", editorial ? editorial.nombre : "Editorial desconocida"),
    crearDato("Género", genero ? genero.nombre : SIN_CLASIFICAR),
    crearDato("Autores", autores.map((autor) => autor.nombre).join(", "))
  );

  const precio = document.createElement("p");
  precio.className = "book-card__price";
  precio.textContent = formatoPrecio.format(libro.precio);

  tarjeta.append(etiquetaGenero, titulo, datos, precio);
  item.append(tarjeta);
  return item;
}

/**
 * Dibuja la lista de libros y actualiza el mensaje de estado.
 * Distingue tres casos: catálogo vacío, búsqueda sin resultados y resultados.
 */
function renderizarCatalogo(libros, busqueda, elementos) {
  const { lista, mensaje } = elementos;
  const termino = busqueda.trim();

  lista.replaceChildren(...libros.map(crearTarjetaLibro));

  mensaje.classList.remove("message--info", "message--warning");

  if (LIBROS.length === 0) {
    mensaje.textContent = "Todavía no hay libros cargados en el catálogo.";
    mensaje.classList.add("message--info");
  } else if (libros.length === 0) {
    mensaje.textContent = `Sin resultados: ningún título contiene «${termino}». Probá con otra palabra o borrá la búsqueda.`;
    mensaje.classList.add("message--warning");
  } else if (termino === "") {
    mensaje.textContent = `Mostrando los ${libros.length} libros del catálogo.`;
  } else {
    const plural = libros.length === 1 ? "libro coincide" : "libros coinciden";
    mensaje.textContent = `${libros.length} ${plural} con «${termino}».`;
  }
}

/* ---------- Eventos ---------- */

function iniciarCatalogo() {
  const elementos = {
    formulario: document.getElementById("buscador-form"),
    campo: document.getElementById("busqueda-titulo"),
    botonLimpiar: document.getElementById("limpiar-busqueda"),
    lista: document.getElementById("catalogo-lista"),
    mensaje: document.getElementById("catalogo-mensaje"),
  };

  const problemas = validarRelacionesLibros(LIBROS);
  if (problemas.length > 0) {
    console.warn("Datos iniciales con relaciones inválidas:", problemas);
  }

  const actualizar = () => {
    const busqueda = elementos.campo.value;
    renderizarCatalogo(filtrarPorTitulo(LIBROS, busqueda), busqueda, elementos);
  };

  // Filtra mientras se escribe; el submit (Enter) no recarga la página.
  elementos.campo.addEventListener("input", actualizar);
  elementos.formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    actualizar();
  });
  elementos.botonLimpiar.addEventListener("click", () => {
    elementos.campo.value = "";
    actualizar();
    elementos.campo.focus();
  });

  actualizar();
}

document.addEventListener("DOMContentLoaded", iniciarCatalogo);
