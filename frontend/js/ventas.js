/*
 * Ventas e historial contra la API (Global · Ejercicio 3 · change C-03).
 *
 * Responsabilidades:
 *   - Cargar clientes y libros disponibles desde GET /clientes/ y GET /libros/
 *     y actualizarlos al recibir clientes-actualizados / libros-actualizados
 *     sin perder el borrador en curso (RN-UI-04).
 *   - Armar el borrador multirrenglón (agregar, cambiar cantidad, quitar)
 *     validando libro único y cantidades enteras entre 1 y 10000.
 *   - Enviar POST /ventas/ únicamente con { cliente_id, renglones }
 *     (extra="forbid" en el backend), deshabilitando el botón mientras se
 *     procesa.
 *   - Con el 201 Created: mostrar precios unitarios copiados del catálogo,
 *     subtotales y total de la respuesta, limpiar el borrador, actualizar el
 *     historial y emitir ventas-actualizadas.
 *   - Ante 409 o 422: mostrar el mensaje del servidor y conservar el borrador.
 *   - Consultar GET /ventas/ con limit y offset y abrir GET /ventas/{id} para
 *     mostrar los importes históricos congelados.
 */

const LIMITE_OPCIONES_VENTA = 100;
const LIMITE_HISTORIAL_DEFECTO = 20;
const LIMITE_HISTORIAL_MIN = 1;
const LIMITE_HISTORIAL_MAX = 100;

let clientesVenta = [];
let librosVenta = [];
let ventasHistorial = [];

const estadoHistorial = {
  limit: LIMITE_HISTORIAL_DEFECTO,
  offset: 0,
};

function nombreClienteVenta(cliente) {
  if (!cliente) return "Cliente desconocido";
  return cliente.nombre ?? cliente.nombreCompleto ?? `Cliente #${cliente.id}`;
}

function completarOpcionesVenta(select, lista, textoInicial, describir, valorPreferido = select.value) {
  const inicial = document.createElement("option");
  inicial.value = "";
  inicial.textContent = textoInicial;
  const opciones = lista.map((item) => {
    const opcion = document.createElement("option");
    opcion.value = String(item.id);
    opcion.textContent = describir(item);
    return opcion;
  });
  select.replaceChildren(inicial, ...opciones);
  select.value = buscarEnListaPorId(lista, valorPreferido) ? String(valorPreferido) : "";
}

function refrescarOpcionesVenta() {
  const selectCliente = document.getElementById("venta-cliente");
  const selectLibro = document.getElementById("venta-libro");
  const clienteElegido = borradorVenta.clienteId !== "" ? borradorVenta.clienteId : selectCliente.value;

  completarOpcionesVenta(
    selectCliente,
    clientesVenta,
    "Seleccione un cliente…",
    (cliente) => `${nombreClienteVenta(cliente)} (${cliente.email})`,
    clienteElegido
  );
  completarOpcionesVenta(
    selectLibro,
    librosVenta,
    "Seleccione un libro…",
    (libro) => {
      const precio = formatearImporteApi(libro.precio);
      const stock = typeof libro.stock === "number" ? ` · Stock: ${libro.stock}` : "";
      return `${libro.titulo} · ${precio}${stock}`;
    },
    selectLibro.value
  );
}

async function cargarClientesVenta() {
  try {
    const { datos } = await apiFetch("/clientes/", {
      parametros: { limit: LIMITE_OPCIONES_VENTA, offset: 0 },
    });
    clientesVenta = Array.isArray(datos) ? datos : [];
    refrescarOpcionesVenta();
    return [];
  } catch (error) {
    return mensajesDeError(error).map((texto) => `Clientes: ${texto}`);
  }
}

async function cargarLibrosVenta() {
  try {
    const { datos } = await apiFetch("/libros/", {
      parametros: { limit: LIMITE_OPCIONES_VENTA, offset: 0 },
    });
    librosVenta = Array.isArray(datos) ? datos : [];
    refrescarOpcionesVenta();
    actualizarImportesVenta();
    return [];
  } catch (error) {
    return mensajesDeError(error).map((texto) => `Libros: ${texto}`);
  }
}

function mostrarErroresVenta(errores, enfocar = false) {
  const contenedor = document.getElementById("ventas-errores");
  contenedor.replaceChildren();
  if (errores.length) {
    mostrarErrores(contenedor, errores);
    if (enfocar) contenedor.focus();
  }
}

function mostrarErroresHistorial(errores) {
  const contenedor = document.getElementById("historial-errores");
  if (!contenedor) return;
  contenedor.replaceChildren();
  if (errores.length) {
    mostrarErrores(contenedor, errores);
  }
}

/** Lee también ediciones/manipulaciones que aún no dispararon un evento. */
function leerBorradorVenta() {
  return {
    clienteId: document.getElementById("venta-cliente").value,
    renglones: Array.from(document.querySelectorAll("#venta-cuerpo tr")).map((fila) => ({
      libroId: fila.dataset.libroId,
      cantidad: fila.querySelector(".cantidad-renglon").value,
    })),
  };
}

function sincronizarBorradorVenta() {
  const actual = leerBorradorVenta();
  borradorVenta.clienteId = actual.clienteId;
  borradorVenta.renglones = actual.renglones.map((renglon) => {
    const cantidad = cantidadVenta(renglon.cantidad);
    return {
      libroId: renglon.libroId,
      cantidad: cantidad !== null ? cantidad : renglon.cantidad,
    };
  });
}

function validarRenglonConLimite(renglones, libros) {
  const resultado = calcularVenta(renglones, libros);
  const errores = [...resultado.errores];
  renglones.forEach((renglon, indice) => {
    const cantidad = cantidadVenta(renglon.cantidad);
    if (cantidad !== null && cantidad > MAX_CANTIDAD_VENTA) {
      errores.push(`Renglón ${indice + 1}: la cantidad admite hasta ${MAX_CANTIDAD_VENTA} unidades.`);
    }
  });
  return {
    errores,
    renglones: resultado.renglones,
    totalCentavos: errores.length ? null : resultado.totalCentavos,
  };
}

function actualizarImportesVenta() {
  const calculo = validarRenglonConLimite(borradorVenta.renglones, librosVenta);
  document.querySelectorAll("#venta-cuerpo tr").forEach((fila, indice) => {
    const renglon = borradorVenta.renglones[indice];
    const individual = validarRenglonConLimite([renglon], librosVenta);
    const cantidad = fila.querySelector(".cantidad-renglon");
    const cantidadNumero = cantidadVenta(renglon.cantidad);
    const cantidadInvalida = cantidadNumero === null || cantidadNumero > MAX_CANTIDAD_VENTA;
    cantidad.setAttribute("aria-invalid", String(cantidadInvalida));
    const importe = individual.renglones[0];
    fila.querySelector(".precio-renglon").textContent =
      importe && !cantidadInvalida ? formatearCentavosVenta(importe.precioUnitarioCentavos) : "Pendiente de corrección";
    fila.querySelector(".subtotal-renglon").textContent =
      importe && !cantidadInvalida ? formatearCentavosVenta(importe.subtotalCentavos) : "Pendiente de corrección";
  });
  document.getElementById("venta-total").textContent = calculo.errores.length
    ? "Pendiente de corrección"
    : formatearCentavosVenta(calculo.totalCentavos ?? 0);
  return calculo;
}

function renderizarBorradorVenta() {
  const filas = borradorVenta.renglones.map((renglon, indice) => {
    const libro = buscarEnListaPorId(librosVenta, renglon.libroId);
    const titulo = libro ? libro.titulo : "Libro inexistente";
    const fila = document.createElement("tr");
    fila.dataset.libroId = String(renglon.libroId);
    const celdaCantidad = document.createElement("td");
    const etiqueta = document.createElement("label");
    etiqueta.className = "visualmente-oculto";
    etiqueta.htmlFor = `venta-cantidad-${renglon.libroId}`;
    etiqueta.textContent = `Cantidad de ${titulo}`;
    const cantidad = document.createElement("input");
    cantidad.id = etiqueta.htmlFor;
    cantidad.className = "input cantidad-renglon";
    cantidad.type = "number";
    cantidad.min = "1";
    cantidad.max = String(MAX_CANTIDAD_VENTA);
    cantidad.step = "1";
    cantidad.inputMode = "numeric";
    cantidad.value = String(renglon.cantidad);
    cantidad.setAttribute("aria-describedby", "ventas-errores");
    const editar = () => {
      sincronizarBorradorVenta();
      limpiarMensaje(document.getElementById("ventas-mensaje"));
      mostrarErroresVenta(actualizarImportesVenta().errores);
    };
    cantidad.addEventListener("input", editar);
    cantidad.addEventListener("change", editar);
    celdaCantidad.append(etiqueta, cantidad);
    const precio = crearCeldaTabla("");
    precio.className = "precio-renglon";
    const subtotal = crearCeldaTabla("");
    subtotal.className = "subtotal-renglon";
    const accion = document.createElement("td");
    const quitar = document.createElement("button");
    quitar.type = "button";
    quitar.className = "button button--secondary";
    quitar.textContent = "Quitar";
    quitar.setAttribute("aria-label", `Quitar ${titulo}`);
    quitar.addEventListener("click", () => {
      sincronizarBorradorVenta();
      quitarRenglonVenta(borradorVenta, renglon.libroId);
      renderizarBorradorVenta();
      mostrarErroresVenta(actualizarImportesVenta().errores);
      limpiarMensaje(document.getElementById("ventas-mensaje"));
      const restantes = document.querySelectorAll("#venta-cuerpo .cantidad-renglon");
      (restantes[Math.min(indice, restantes.length - 1)] || document.getElementById("venta-libro")).focus();
    });
    accion.append(quitar);
    fila.append(crearCeldaTabla(`${titulo} (#${renglon.libroId})`), celdaCantidad, precio, subtotal, accion);
    return fila;
  });
  document.getElementById("venta-cuerpo").replaceChildren(...filas);
  document.getElementById("venta-vacio").hidden = filas.length > 0;
  actualizarImportesVenta();
}

/* ---------- Historial y Detalle (GET /ventas/ y GET /ventas/{id}) ---------- */

function mostrarDetalleVenta(venta) {
  const contenedor = document.getElementById("historial-detalle");
  const titulo = document.createElement("h2");
  titulo.id = "historial-detalle-titulo";
  titulo.tabIndex = -1;
  titulo.textContent = `Detalle de venta #${venta.id}`;

  const nombreCliente = nombreClienteVenta(venta.cliente);
  const idCliente = venta.cliente ? venta.cliente.id : "";
  const emailCliente = venta.cliente ? venta.cliente.email : "";
  const datos = document.createElement("p");
  datos.textContent = `${new Date(venta.fecha).toLocaleString("es-AR")} · ${nombreCliente} (#${idCliente}) · ${emailCliente}`;

  const envoltura = document.createElement("div");
  envoltura.className = "table-wrap";
  const tabla = document.createElement("table");
  tabla.className = "table";
  tabla.setAttribute("aria-labelledby", titulo.id);
  const encabezado = document.createElement("thead");
  const filaEncabezado = document.createElement("tr");
  ["Libro", "Cantidad", "Precio unitario", "Subtotal"].forEach((texto) => {
    const celda = document.createElement("th");
    celda.scope = "col";
    celda.textContent = texto;
    filaEncabezado.append(celda);
  });
  encabezado.append(filaEncabezado);

  const cuerpo = document.createElement("tbody");
  (venta.renglones || []).forEach((renglon) => {
    const idLibro = renglon.libro_id ?? renglon.libroId;
    const precioUnitario = renglon.precio_unitario !== undefined
      ? formatearImporteApi(renglon.precio_unitario)
      : formatearCentavosVenta(renglon.precioUnitarioCentavos);
    const subtotal = renglon.subtotal !== undefined
      ? formatearImporteApi(renglon.subtotal)
      : formatearCentavosVenta(renglon.subtotalCentavos);
    const fila = document.createElement("tr");
    fila.append(
      crearCeldaTabla(`${renglon.titulo} (#${idLibro})`),
      crearCeldaTabla(renglon.cantidad),
      crearCeldaTabla(precioUnitario),
      crearCeldaTabla(subtotal)
    );
    cuerpo.append(fila);
  });
  tabla.append(encabezado, cuerpo);
  envoltura.append(tabla);

  const totalImporte = venta.total !== undefined
    ? formatearImporteApi(venta.total)
    : formatearCentavosVenta(venta.totalCentavos);
  const total = document.createElement("p");
  total.className = "venta-total";
  total.textContent = `Total: ${totalImporte}`;

  contenedor.replaceChildren(titulo, datos, envoltura, total);
  contenedor.hidden = false;
  titulo.focus();
}

async function cargarDetalleVenta(ventaId, botonOrigen = null) {
  mostrarErroresHistorial([]);
  if (botonOrigen) botonOrigen.disabled = true;
  try {
    const { datos: venta } = await apiFetch(`/ventas/${ventaId}`);
    mostrarDetalleVenta(venta);
  } catch (error) {
    mostrarErroresHistorial(mensajesDeError(error));
  } finally {
    if (botonOrigen) botonOrigen.disabled = false;
  }
}

function actualizarControlesPaginacionHistorial(cantidadRecibida) {
  const botonAnterior = document.getElementById("historial-anterior");
  const botonSiguiente = document.getElementById("historial-siguiente");
  const indicadorPagina = document.getElementById("historial-pagina");
  const selectLimit = document.getElementById("historial-limit");

  const numeroPagina = Math.floor(estadoHistorial.offset / estadoHistorial.limit) + 1;
  if (selectLimit) selectLimit.value = String(estadoHistorial.limit);
  if (indicadorPagina) {
    indicadorPagina.textContent = `Página ${numeroPagina} (desde ${estadoHistorial.offset})`;
  }
  if (botonAnterior) {
    botonAnterior.disabled = estadoHistorial.offset <= 0;
  }
  if (botonSiguiente) {
    botonSiguiente.disabled = cantidadRecibida < estadoHistorial.limit;
  }
}

function renderizarHistorialVentas() {
  const filas = ventasHistorial.map((venta) => {
    const fila = document.createElement("tr");
    const accion = document.createElement("td");
    const detalle = document.createElement("button");
    detalle.type = "button";
    detalle.className = "button button--secondary";
    detalle.textContent = "Ver detalle";
    detalle.setAttribute("aria-label", `Ver detalle de venta ${venta.id}`);
    detalle.addEventListener("click", () => cargarDetalleVenta(venta.id, detalle));
    accion.append(detalle);

    const totalTexto = venta.total !== undefined
      ? formatearImporteApi(venta.total)
      : formatearCentavosVenta(venta.totalCentavos);
    fila.append(
      crearCeldaTabla(venta.id),
      crearCeldaTabla(new Date(venta.fecha).toLocaleString("es-AR")),
      crearCeldaTabla(nombreClienteVenta(venta.cliente)),
      crearCeldaTabla(totalTexto),
      accion
    );
    return fila;
  });
  document.getElementById("historial-cuerpo").replaceChildren(...filas);
  document.getElementById("historial-vacio").hidden = filas.length > 0;
}

async function cargarHistorialVentas() {
  mostrarErroresHistorial([]);
  try {
    const { datos } = await apiFetch("/ventas/", {
      parametros: { limit: estadoHistorial.limit, offset: estadoHistorial.offset },
    });
    ventasHistorial = Array.isArray(datos) ? datos : [];
    renderizarHistorialVentas();
    actualizarControlesPaginacionHistorial(ventasHistorial.length);
    return [];
  } catch (error) {
    const errores = mensajesDeError(error);
    mostrarErroresHistorial(errores);
    actualizarControlesPaginacionHistorial(0);
    return errores.map((texto) => `Historial de ventas: ${texto}`);
  }
}

/* ---------- Envío de POST /ventas/ ---------- */

async function enviarVenta() {
  sincronizarBorradorVenta();
  const mensaje = document.getElementById("ventas-mensaje");
  const botonConfirmar = document.getElementById("venta-confirmar");

  limpiarMensaje(mensaje);
  mostrarErroresVenta([]);
  actualizarImportesVenta();

  const clienteValido = buscarEnListaPorId(clientesVenta, borradorVenta.clienteId);
  marcarAriaInvalid(["venta-cliente"], new Set(clienteValido ? [] : ["venta-cliente"]));

  const validacion = validarBorradorVenta(borradorVenta, librosVenta, clientesVenta);
  if (validacion.errores.length > 0) {
    mostrarErroresVenta(validacion.errores, true);
    return;
  }

  botonConfirmar.disabled = true;
  try {
    const { datos: venta } = await apiFetch("/ventas/", {
      metodo: "POST",
      cuerpo: construirCuerpoVenta(borradorVenta),
    });

    borradorVenta.clienteId = "";
    borradorVenta.renglones = [];
    document.getElementById("venta-cliente").value = "";
    document.getElementById("venta-libro").value = "";
    document.getElementById("venta-cantidad").value = "1";
    marcarAriaInvalid(["venta-libro", "venta-cantidad", "venta-cliente"], new Set());
    renderizarBorradorVenta();

    mensaje.classList.add("message--info");
    mensaje.textContent = describirConfirmacionVenta(venta);

    mostrarDetalleVenta(venta);
    estadoHistorial.offset = 0;
    await Promise.all([cargarHistorialVentas(), cargarLibrosVenta()]);
    document.dispatchEvent(new CustomEvent("ventas-actualizadas", { detail: { venta } }));
    document.getElementById("venta-cliente").focus();
  } catch (error) {
    // 409 (stock insuficiente, cliente o libro inexistente) o 422:
    // se muestran los mensajes del servidor y el borrador se conserva intacto.
    mostrarErroresVenta(mensajesDeError(error), true);
  } finally {
    botonConfirmar.disabled = false;
  }
}

/* ---------- Inicialización y eventos ---------- */

async function iniciarVentas() {
  refrescarOpcionesVenta();
  renderizarBorradorVenta();
  renderizarHistorialVentas();
  actualizarControlesPaginacionHistorial(0);

  document.addEventListener("clientes-actualizados", (evento) => {
    const nuevo = evento && evento.detail ? evento.detail.cliente : null;
    if (nuevo && !buscarEnListaPorId(clientesVenta, nuevo.id)) {
      clientesVenta = [...clientesVenta, nuevo];
    }
    refrescarOpcionesVenta();
  });

  document.addEventListener("libros-actualizados", (evento) => {
    const nuevo = evento && evento.detail ? evento.detail.libro : null;
    if (nuevo) {
      const existente = librosVenta.findIndex((item) => mismoIdVenta(item.id, nuevo.id));
      if (existente === -1) {
        librosVenta = [...librosVenta, nuevo];
      } else {
        librosVenta[existente] = nuevo;
      }
    }
    refrescarOpcionesVenta();
    actualizarImportesVenta();
  });

  document.getElementById("venta-cliente").addEventListener("change", () => {
    borradorVenta.clienteId = document.getElementById("venta-cliente").value;
    marcarAriaInvalid(
      ["venta-cliente"],
      new Set(buscarEnListaPorId(clientesVenta, borradorVenta.clienteId) ? [] : ["venta-cliente"])
    );
  });

  document.getElementById("venta-agregar").addEventListener("click", () => {
    sincronizarBorradorVenta();
    limpiarMensaje(document.getElementById("ventas-mensaje"));
    const libroId = document.getElementById("venta-libro").value;
    const cantidad = document.getElementById("venta-cantidad").value;
    const cantidadNum = cantidadVenta(cantidad);
    const cantidadInvalida = cantidadNum === null || cantidadNum > MAX_CANTIDAD_VENTA;

    const errores = [];
    if (cantidadNum !== null && cantidadNum > MAX_CANTIDAD_VENTA) {
      errores.push(`La cantidad admite hasta ${MAX_CANTIDAD_VENTA} unidades.`);
    } else {
      const resultado = agregarRenglonVenta(borradorVenta, librosVenta, libroId, cantidad);
      errores.push(...resultado.errores);
    }

    marcarAriaInvalid(["venta-libro", "venta-cantidad"], new Set([
      ...(!buscarEnListaPorId(librosVenta, libroId) ? ["venta-libro"] : []),
      ...(cantidadInvalida ? ["venta-cantidad"] : []),
    ]));
    mostrarErroresVenta(errores);
    if (!errores.length) {
      renderizarBorradorVenta();
      document.getElementById("venta-libro").value = "";
      document.getElementById("venta-cantidad").value = "1";
      document.getElementById("venta-libro").focus();
    }
  });

  document.getElementById("form-venta").addEventListener("submit", (evento) => {
    evento.preventDefault();
    return enviarVenta();
  });

  const selectLimitHistorial = document.getElementById("historial-limit");
  if (selectLimitHistorial) {
    selectLimitHistorial.addEventListener("change", () => {
      const nuevoLimit = Number(selectLimitHistorial.value);
      estadoHistorial.limit =
        Number.isInteger(nuevoLimit) && nuevoLimit >= LIMITE_HISTORIAL_MIN && nuevoLimit <= LIMITE_HISTORIAL_MAX
          ? nuevoLimit
          : LIMITE_HISTORIAL_DEFECTO;
      estadoHistorial.offset = 0;
      return cargarHistorialVentas();
    });
  }

  const botonHistorialAnterior = document.getElementById("historial-anterior");
  if (botonHistorialAnterior) {
    botonHistorialAnterior.addEventListener("click", () => {
      if (estadoHistorial.offset <= 0) return;
      estadoHistorial.offset = Math.max(0, estadoHistorial.offset - estadoHistorial.limit);
      return cargarHistorialVentas();
    });
  }

  const botonHistorialSiguiente = document.getElementById("historial-siguiente");
  if (botonHistorialSiguiente) {
    botonHistorialSiguiente.addEventListener("click", () => {
      estadoHistorial.offset += estadoHistorial.limit;
      return cargarHistorialVentas();
    });
  }

  const [erroresClientes, erroresLibros] = await Promise.all([
    cargarClientesVenta(),
    cargarLibrosVenta(),
    cargarHistorialVentas(),
  ]);
  const erroresCarga = [...erroresClientes, ...erroresLibros];
  if (erroresCarga.length > 0) {
    mostrarErroresVenta(erroresCarga);
  }
}

document.addEventListener("DOMContentLoaded", iniciarVentas);
