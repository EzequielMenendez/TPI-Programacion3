/*
 * Catálogo y cliente HTTP (Global · Ejercicio 1 · change C-01).
 *
 * Responsabilidades:
 *   - Cargar GET /libros/ mediante apiFetch con titulo (búsqueda parcial sin
 *     distinguir mayúsculas), limit (1 a 100, por defecto 20) y offset (desde 0).
 *   - Reiniciar el desplazamiento (offset = 0) al cambiar el filtro o el límite.
 *   - Mostrar título, ISBN, precio, editorial y género («Sin clasificar» cuando
 *     es nulo).
 *   - Consultar GET /libros/{id} para ver los autores con su rol y orden.
 *   - Diferenciar carga, lista vacía, búsqueda sin coincidencias y error de
 *     conexión.
 *
 * Todo texto se inserta con textContent, nunca con innerHTML.
 */

const SIN_CLASIFICAR = "Sin clasificar";
const LIMITE_CATALOGO_DEFECTO = 20;
const LIMITE_CATALOGO_MIN = 1;
const LIMITE_CATALOGO_MAX = 100;

const formatoPrecio = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const estadoCatalogo = {
  titulo: "",
  limit: LIMITE_CATALOGO_DEFECTO,
  offset: 0,
};

let secuenciaCatalogo = 0;

/* ---------- Consultas y validaciones locales heredadas (E3 / baseline) ---------- */

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

/** Quita espacios en los extremos y pasa a minúsculas. */
function normalizarBusqueda(texto) {
  return String(texto ?? "").trim().toLocaleLowerCase("es");
}

function filtrarPorTitulo(libros, busqueda) {
  const termino = normalizarBusqueda(busqueda);
  if (termino === "") {
    return libros;
  }
  return libros.filter((libro) =>
    libro.titulo.toLocaleLowerCase("es").includes(termino)
  );
}

/* ---------- Parámetros de paginación y filtro para GET /libros/ ---------- */

/** Normaliza el límite entre 1 y 100 (por defecto 20). */
function normalizarLimiteCatalogo(valor) {
  const numero = Number(String(valor ?? "").trim());
  if (!Number.isInteger(numero) || numero < LIMITE_CATALOGO_MIN || numero > LIMITE_CATALOGO_MAX) {
    return LIMITE_CATALOGO_DEFECTO;
  }
  return numero;
}

/** Normaliza el offset como entero desde 0. */
function normalizarOffsetCatalogo(valor) {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < 0) {
    return 0;
  }
  return numero;
}

/**
 * Arma los query params de GET /libros/: limit (1..100, por defecto 20),
 * offset (desde 0) y titulo cuando la búsqueda recortada no está vacía.
 */
function construirParametrosCatalogo(estado = {}) {
  const parametros = {
    limit: normalizarLimiteCatalogo(estado.limit),
    offset: normalizarOffsetCatalogo(estado.offset),
  };
  const titulo = String(estado.titulo ?? "").trim();
  if (titulo !== "") {
    parametros.titulo = titulo;
  }
  return parametros;
}

function formatearAutoresDetalle(autores) {
  if (!Array.isArray(autores) || autores.length === 0) {
    return "Sin autores registrados";
  }
  return [...autores]
    .sort((a, b) => a.orden - b.orden)
    .map((autoria) => `${autoria.nombre} (${autoria.rol})`)
    .join(", ");
}

/* ---------- Renderizado de tarjetas y estados ---------- */

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

/**
 * Consulta GET /libros/{id} para mostrar los autores (y el stock) del libro.
 */
async function consultarDetalleLibro(libroId, ddAutores, ddStock, boton) {
  boton.disabled = true;
  ddAutores.textContent = "Cargando autores…";
  try {
    const { datos } = await apiFetch(`/libros/${libroId}`);
    ddAutores.textContent = formatearAutoresDetalle(datos.autores);
    ddStock.textContent = `${datos.stock} ${datos.stock === 1 ? "unidad" : "unidades"}`;
    boton.textContent = "Actualizar autores";
  } catch (error) {
    ddAutores.textContent = mensajesDeError(error).join(" ");
    boton.textContent = "Reintentar autores";
  } finally {
    boton.disabled = false;
  }
}

/**
 * Crea una tarjeta del catálogo a partir de un LibroListado devuelto por GET /libros/.
 * Muestra título, ISBN, precio, editorial y género («Sin clasificar» si es nulo),
 * y permite consultar GET /libros/{id} para ver los autores.
 */
function crearTarjetaLibroApi(libro) {
  const nombreEditorial = libro.editorial && libro.editorial.nombre
    ? libro.editorial.nombre
    : "Editorial desconocida";
  const nombreGenero = libro.genero && libro.genero.nombre
    ? libro.genero.nombre
    : SIN_CLASIFICAR;

  const item = document.createElement("li");
  const tarjeta = document.createElement("article");
  tarjeta.className = "card book-card";
  tarjeta.dataset.libroId = String(libro.id);

  const etiquetaGenero = document.createElement("p");
  etiquetaGenero.className = libro.genero ? "tag" : "tag tag--muted";
  etiquetaGenero.textContent = nombreGenero;

  const titulo = document.createElement("h3");
  titulo.className = "book-card__title";
  titulo.textContent = libro.titulo;

  const filaAutores = crearDato(
    "Autores",
    Array.isArray(libro.autores) && libro.autores.length > 0
      ? formatearAutoresDetalle(libro.autores)
      : "Consultá el detalle para ver los autores"
  );
  const ddAutores = filaAutores.hijos ? filaAutores.hijos[1] : filaAutores.lastChild;

  const filaStock = crearDato(
    "Stock",
    typeof libro.stock === "number"
      ? `${libro.stock} ${libro.stock === 1 ? "unidad" : "unidades"}`
      : "—"
  );
  const ddStock = filaStock.hijos ? filaStock.hijos[1] : filaStock.lastChild;

  const datos = document.createElement("dl");
  datos.className = "book-card__data";
  datos.append(
    crearDato("ISBN", libro.isbn),
    crearDato("Editorial", nombreEditorial),
    crearDato("Género", nombreGenero),
    filaStock,
    filaAutores
  );

  const precio = document.createElement("p");
  precio.className = "book-card__price";
  precio.textContent = formatoPrecio.format(Number(libro.precio));

  const acciones = document.createElement("div");
  acciones.className = "book-card__actions";
  const botonAutores = document.createElement("button");
  botonAutores.type = "button";
  botonAutores.className = "button button--secondary";
  botonAutores.dataset.libroId = String(libro.id);
  botonAutores.textContent = "Ver autores";
  botonAutores.addEventListener("click", () =>
    consultarDetalleLibro(libro.id, ddAutores, ddStock, botonAutores)
  );
  acciones.append(botonAutores);

  tarjeta.append(etiquetaGenero, titulo, datos, precio, acciones);
  item.append(tarjeta);
  return item;
}

function mostrarEstadoCatalogo(mensajeElemento, texto, tono) {
  mensajeElemento.classList.remove("message--info", "message--warning");
  mensajeElemento.textContent = texto;
  if (tono) {
    mensajeElemento.classList.add(tono);
  }
}

function actualizarControlesPaginacion(elementos, cantidadRecibida, cargando = false) {
  const { botonAnterior, botonSiguiente, etiquetaPagina } = elementos;
  const pagina = Math.floor(estadoCatalogo.offset / estadoCatalogo.limit) + 1;
  if (etiquetaPagina) {
    etiquetaPagina.textContent = `Página ${pagina} (offset ${estadoCatalogo.offset})`;
  }
  if (botonAnterior) {
    botonAnterior.disabled = cargando || estadoCatalogo.offset <= 0;
  }
  if (botonSiguiente) {
    botonSiguiente.disabled = cargando || cantidadRecibida < estadoCatalogo.limit;
  }
}

/**
 * Renderiza la página de libros recibida de GET /libros/ y diferencia entre
 * lista vacía, búsqueda sin coincidencias y resultados.
 */
function renderizarCatalogoApi(libros, elementos) {
  const { lista, mensaje } = elementos;
  const termino = estadoCatalogo.titulo.trim();

  lista.replaceChildren(...libros.map(crearTarjetaLibroApi));
  actualizarControlesPaginacion(elementos, libros.length, false);

  if (libros.length === 0 && termino !== "") {
    mostrarEstadoCatalogo(
      mensaje,
      `Sin resultados: ningún título contiene «${termino}». Probá con otra palabra o borrá la búsqueda.`,
      "message--warning"
    );
  } else if (libros.length === 0 && estadoCatalogo.offset === 0) {
    mostrarEstadoCatalogo(
      mensaje,
      "Todavía no hay libros cargados en el catálogo.",
      "message--info"
    );
  } else if (libros.length === 0) {
    mostrarEstadoCatalogo(
      mensaje,
      "No hay más libros en esta página. Volvé a la página anterior.",
      "message--info"
    );
  } else if (termino === "") {
    const plural = libros.length === 1 ? "libro mostrado" : "libros mostrados";
    mostrarEstadoCatalogo(
      mensaje,
      `Mostrando ${libros.length} ${plural} del catálogo (desde ${estadoCatalogo.offset + 1}).`,
      null
    );
  } else {
    const plural = libros.length === 1 ? "libro coincide" : "libros coinciden";
    mostrarEstadoCatalogo(
      mensaje,
      `${libros.length} ${plural} con «${termino}».`,
      null
    );
  }
}

function obtenerElementosCatalogo() {
  return {
    formulario: document.getElementById("buscador-form"),
    campo: document.getElementById("busqueda-titulo"),
    botonLimpiar: document.getElementById("limpiar-busqueda"),
    selectLimite: document.getElementById("catalogo-limit"),
    botonAnterior: document.getElementById("catalogo-anterior"),
    botonSiguiente: document.getElementById("catalogo-siguiente"),
    etiquetaPagina: document.getElementById("catalogo-pagina"),
    lista: document.getElementById("catalogo-lista"),
    mensaje: document.getElementById("catalogo-mensaje"),
  };
}

/**
 * Consulta GET /libros/ con el filtro y la paginación actuales, diferenciando
 * carga, lista vacía, búsqueda sin coincidencias y error de conexión.
 */
async function cargarCatalogo() {
  const elementos = obtenerElementosCatalogo();
  if (!elementos.lista || !elementos.mensaje) return;

  const pedidoActual = ++secuenciaCatalogo;
  const parametros = construirParametrosCatalogo(estadoCatalogo);

  mostrarEstadoCatalogo(elementos.mensaje, "Cargando catálogo…", "message--info");
  actualizarControlesPaginacion(elementos, 0, true);

  try {
    const { datos: libros } = await apiFetch("/libros/", { parametros });
    if (pedidoActual !== secuenciaCatalogo) return;
    renderizarCatalogoApi(Array.isArray(libros) ? libros : [], elementos);
  } catch (error) {
    if (pedidoActual !== secuenciaCatalogo) return;
    elementos.lista.replaceChildren();
    actualizarControlesPaginacion(elementos, 0, false);
    mostrarEstadoCatalogo(
      elementos.mensaje,
      mensajesDeError(error).join(" "),
      "message--warning"
    );
  }
}

/* ---------- Eventos ---------- */

async function iniciarCatalogo() {
  const elementos = obtenerElementosCatalogo();
  if (!elementos.formulario || !elementos.campo || !elementos.lista || !elementos.mensaje) {
    return;
  }

  estadoCatalogo.titulo = elementos.campo.value.trim();
  estadoCatalogo.limit = elementos.selectLimite
    ? normalizarLimiteCatalogo(elementos.selectLimite.value)
    : LIMITE_CATALOGO_DEFECTO;
  estadoCatalogo.offset = 0;

  const aplicarFiltro = () => {
    estadoCatalogo.titulo = elementos.campo.value.trim();
    estadoCatalogo.offset = 0;
    return cargarCatalogo();
  };

  elementos.campo.addEventListener("input", aplicarFiltro);
  elementos.formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    return aplicarFiltro();
  });
  elementos.botonLimpiar.addEventListener("click", () => {
    elementos.campo.value = "";
    elementos.campo.focus();
    return aplicarFiltro();
  });

  if (elementos.selectLimite) {
    elementos.selectLimite.addEventListener("change", () => {
      estadoCatalogo.limit = normalizarLimiteCatalogo(elementos.selectLimite.value);
      estadoCatalogo.offset = 0;
      return cargarCatalogo();
    });
  }

  if (elementos.botonAnterior) {
    elementos.botonAnterior.addEventListener("click", () => {
      if (estadoCatalogo.offset <= 0) return;
      estadoCatalogo.offset = Math.max(0, estadoCatalogo.offset - estadoCatalogo.limit);
      return cargarCatalogo();
    });
  }

  if (elementos.botonSiguiente) {
    elementos.botonSiguiente.addEventListener("click", () => {
      estadoCatalogo.offset += estadoCatalogo.limit;
      return cargarCatalogo();
    });
  }

  document.addEventListener("libros-actualizados", () => cargarCatalogo());
  document.addEventListener("ventas-actualizadas", () => cargarCatalogo());

  await cargarCatalogo();
}

document.addEventListener("DOMContentLoaded", iniciarCatalogo);
