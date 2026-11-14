/*
 * Alta y consulta de clientes contra la API (Global · Ejercicio 2).
 *
 * Responsabilidades:
 *   - Validar nombre y email y mostrar todos los errores juntos.
 *   - Enviar POST /clientes/ con { nombre, email } y, con el 201, usar el
 *     registro devuelto para actualizar la tabla y avisar al resto de la página.
 *   - Mostrar el mensaje del servidor ante un 409 (email repetido) o un 422.
 *   - Buscar un cliente por id con GET /clientes/{id} y mostrar su nombre.
 *
 * La unicidad del email la decide la base (el backend lo guarda en
 * minúsculas): acá no se compara contra una lista local.
 */

const CAMPOS_CLIENTE = ["cliente-nombre", "cliente-email"];
const LIMITE_CLIENTES = 100;

let clientesCargados = []; // Registros devueltos por la API, para la tabla.

/* ---------- Lectura y validación (sin DOM: se prueban en Node) ---------- */

function esEmailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Lee y recorta los valores del formulario de clientes. */
function leerDatosCliente(formulario) {
  const datos = new FormData(formulario);
  return {
    nombre: String(datos.get("nombre") ?? "").trim(),
    email: String(datos.get("email") ?? "").trim(),
  };
}

/**
 * Valida los campos del cliente con las reglas del contrato ClienteCreate.
 * Devuelve la lista completa de errores y los ids de campos inválidos.
 */
function validarDatosCliente(datos) {
  const errores = [];
  const camposInvalidos = new Set();

  if (datos.nombre === "") {
    errores.push("El nombre es obligatorio.");
    camposInvalidos.add("cliente-nombre");
  } else if (datos.nombre.length > 120) {
    errores.push("El nombre admite hasta 120 caracteres.");
    camposInvalidos.add("cliente-nombre");
  }

  if (datos.email === "") {
    errores.push("El email es obligatorio.");
    camposInvalidos.add("cliente-email");
  } else if (!esEmailValido(datos.email) || datos.email.length > 254) {
    errores.push("El email no tiene un formato válido (ejemplo: nombre@dominio.com).");
    camposInvalidos.add("cliente-email");
  }

  return { errores, camposInvalidos };
}

/** Cuerpo de POST /clientes/: únicamente nombre y email. */
function construirCuerpoCliente(datos) {
  return { nombre: datos.nombre, email: datos.email };
}

/* ---------- Tabla de clientes (datos de la API) ---------- */

function renderizarTablaClientes() {
  const cuerpo = document.getElementById("clientes-cuerpo");
  const mensajeVacio = document.getElementById("clientes-vacio");

  const filas = clientesCargados.map((cliente) => {
    const fila = document.createElement("tr");
    fila.append(
      crearCeldaTabla(cliente.id),
      crearCeldaTabla(cliente.nombre),
      crearCeldaTabla(cliente.email)
    );
    return fila;
  });

  cuerpo.replaceChildren(...filas);
  mensajeVacio.hidden = clientesCargados.length > 0;
}

/** Trae el listado inicial de la tabla. Devuelve los mensajes de error (vacío si salió bien). */
async function cargarTablaClientes() {
  try {
    const { datos } = await apiFetch("/clientes/", { parametros: { limit: LIMITE_CLIENTES, offset: 0 } });
    clientesCargados = datos;
    renderizarTablaClientes();
    return [];
  } catch (error) {
    return mensajesDeError(error).map((texto) => `Listado de clientes: ${texto}`);
  }
}

/* ---------- Alta ---------- */

async function enviarAltaCliente(formulario) {
  const contenedorErrores = document.getElementById("clientes-errores");
  const mensajeResultado = document.getElementById("clientes-mensaje");
  const botonEnviar = document.getElementById("cliente-enviar");

  contenedorErrores.replaceChildren();
  limpiarMensaje(mensajeResultado);

  const datos = leerDatosCliente(formulario);
  const { errores, camposInvalidos } = validarDatosCliente(datos);
  marcarAriaInvalid(CAMPOS_CLIENTE, camposInvalidos);
  if (errores.length > 0) {
    mostrarErrores(contenedorErrores, errores);
    return;
  }

  botonEnviar.disabled = true;
  try {
    // 201: el cuerpo es el cliente registrado (el email vuelve normalizado).
    const { datos: cliente } = await apiFetch("/clientes/", {
      metodo: "POST",
      cuerpo: construirCuerpoCliente(datos),
    });

    clientesCargados.push(cliente);
    formulario.reset();
    mensajeResultado.classList.add("message--info");
    mensajeResultado.textContent =
      `Cliente «${cliente.nombre}» dado de alta con el id ${cliente.id} (${cliente.email}).`;
    renderizarTablaClientes();
    document.dispatchEvent(new CustomEvent("clientes-actualizados", { detail: { cliente } }));
  } catch (error) {
    // 409 (email repetido) o 422: mensaje del servidor; el formulario no se limpia.
    mostrarErrores(contenedorErrores, mensajesDeError(error));
    if (error instanceof ErrorApi && error.status === 409) {
      marcarAriaInvalid(CAMPOS_CLIENTE, new Set(["cliente-email"]));
    }
  } finally {
    botonEnviar.disabled = false;
  }
}

/* ---------- Consulta por id ---------- */

/** Consulta GET /clientes/{id} y muestra nombre y email del cliente. */
async function buscarClientePorId() {
  const campoId = document.getElementById("cliente-buscar-id");
  const boton = document.getElementById("cliente-buscar-boton");
  const resultado = document.getElementById("cliente-buscar-resultado");

  const mostrar = (texto, tono) => {
    limpiarMensaje(resultado);
    resultado.textContent = texto;
    if (tono) resultado.classList.add(tono);
  };

  const clienteId = leerIdEntero(campoId.value);
  if (clienteId === null) {
    mostrar("Ingresá el ID del cliente: un número entero mayor que cero.", "message--warning");
    campoId.setAttribute("aria-invalid", "true");
    return;
  }
  campoId.removeAttribute("aria-invalid");

  boton.disabled = true;
  mostrar("Buscando cliente…", null);
  try {
    const { datos: cliente } = await apiFetch(`/clientes/${clienteId}`);
    mostrar(`Cliente ${cliente.id}: ${cliente.nombre} · ${cliente.email}`, "message--info");
    document.dispatchEvent(new CustomEvent("cliente-encontrado", { detail: { cliente } }));
  } catch (error) {
    const mensajes = error instanceof ErrorApi && error.status === 404
      ? [`No existe un cliente con el ID ${clienteId}.`]
      : mensajesDeError(error);
    mostrar(mensajes.join(" "), "message--warning");
    campoId.setAttribute("aria-invalid", "true");
  } finally {
    boton.disabled = false;
  }
}

/* ---------- Eventos ---------- */

async function iniciarAltaClientes() {
  const formulario = document.getElementById("form-cliente");
  const contenedorErrores = document.getElementById("clientes-errores");
  const mensajeResultado = document.getElementById("clientes-mensaje");

  renderizarTablaClientes();

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    enviarAltaCliente(formulario);
  });

  formulario.addEventListener("reset", () => {
    contenedorErrores.replaceChildren();
    limpiarMensaje(mensajeResultado);
    marcarAriaInvalid(CAMPOS_CLIENTE, new Set());
    document.getElementById("cliente-nombre").focus();
  });

  document.getElementById("form-buscar-cliente").addEventListener("submit", (evento) => {
    evento.preventDefault();
    buscarClientePorId();
  });

  const erroresCarga = await cargarTablaClientes();
  if (erroresCarga.length > 0) {
    mostrarErrores(contenedorErrores, erroresCarga);
  }
}

document.addEventListener("DOMContentLoaded", iniciarAltaClientes);
