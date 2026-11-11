/*
 * Alta de clientes (Ejercicio 4).
 *
 * Responsabilidades:
 *   - Validar nombre completo y email, mostrando todos los errores juntos.
 *   - Asignar el id siguiente (CL-4, CL-5…) con el mayor sufijo existente.
 *   - Actualizar la tabla de clientes sin recargar la página.
 */

/** El email único se compara sin espacios ni mayúsculas. */
function normalizarEmail(email) {
  return email.trim().toLocaleLowerCase("es");
}

function esEmailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Lee y recorta los valores del formulario de clientes. */
function leerDatosCliente(formulario) {
  const datos = new FormData(formulario);
  return {
    nombreCompleto: String(datos.get("nombreCompleto") ?? "").trim(),
    email: String(datos.get("email") ?? "").trim(),
  };
}

/**
 * Valida todos los campos del cliente. Devuelve la lista completa de errores
 * (para el contenedor role="alert") y los ids de campos inválidos (para
 * aria-invalid). Si la lista de errores está vacía, se puede dar de alta.
 */
function validarDatosCliente(datos) {
  const errores = [];
  const camposInvalidos = new Set();

  if (datos.nombreCompleto === "") {
    errores.push("El nombre completo es obligatorio.");
    camposInvalidos.add("cliente-nombre");
  }

  if (datos.email === "") {
    errores.push("El email es obligatorio.");
    camposInvalidos.add("cliente-email");
  } else if (!esEmailValido(datos.email)) {
    errores.push("El email no tiene un formato válido (ejemplo: nombre@dominio.com).");
    camposInvalidos.add("cliente-email");
  } else {
    const normalizado = normalizarEmail(datos.email);
    const repetido = CLIENTES.some((cliente) => normalizarEmail(cliente.email) === normalizado);
    if (repetido) {
      errores.push("El email ya está registrado: al comparar se ignoran espacios y mayúsculas.");
      camposInvalidos.add("cliente-email");
    }
  }

  return { errores, camposInvalidos };
}

/** Dibuja la tabla de clientes desde CLIENTES y alterna el mensaje de lista vacía. */
function renderizarTablaClientes() {
  const cuerpo = document.getElementById("clientes-cuerpo");
  const mensajeVacio = document.getElementById("clientes-vacio");

  const filas = CLIENTES.map((cliente) => {
    const fila = document.createElement("tr");
    fila.append(
      crearCeldaTabla(cliente.id),
      crearCeldaTabla(cliente.nombreCompleto),
      crearCeldaTabla(cliente.email)
    );
    return fila;
  });

  cuerpo.replaceChildren(...filas);
  mensajeVacio.hidden = CLIENTES.length > 0;
}

function iniciarAltaClientes() {
  const formulario = document.getElementById("form-cliente");
  const contenedorErrores = document.getElementById("clientes-errores");
  const mensajeResultado = document.getElementById("clientes-mensaje");
  const idsCampos = ["cliente-nombre", "cliente-email"];

  renderizarTablaClientes();

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    contenedorErrores.replaceChildren();
    limpiarMensaje(mensajeResultado);

    const datos = leerDatosCliente(formulario);
    const { errores, camposInvalidos } = validarDatosCliente(datos);
    marcarAriaInvalid(idsCampos, camposInvalidos);

    if (errores.length > 0) {
      mostrarErrores(contenedorErrores, errores);
      return;
    }

    const cliente = {
      id: siguienteIdPrefijado(CLIENTES, "CL"),
      nombreCompleto: datos.nombreCompleto,
      email: datos.email,
    };
    CLIENTES.push(cliente);
    const persistido = persistirEstadoBiblioteca();

    formulario.reset();
    marcarAriaInvalid(idsCampos, new Set());
    mensajeResultado.classList.add(persistido ? "message--info" : "message--warning");
    mensajeResultado.textContent = persistido
      ? `Cliente «${cliente.nombreCompleto}» dado de alta con el id ${cliente.id}.`
      : `Cliente «${cliente.nombreCompleto}» dado de alta, pero no se pudo guardar en este navegador.`;
    renderizarTablaClientes();
    document.dispatchEvent(new Event("clientes-actualizados"));
  });

  formulario.addEventListener("reset", () => {
    contenedorErrores.replaceChildren();
    limpiarMensaje(mensajeResultado);
    marcarAriaInvalid(idsCampos, new Set());
    document.getElementById("cliente-nombre").focus();
  });
}

document.addEventListener("DOMContentLoaded", iniciarAltaClientes);
