/* Interfaz local E5. El historial se presenta únicamente desde sus snapshots. */
function completarOpcionesVenta(select, lista, textoInicial, describir) {
  const seleccionado = select.value;
  const inicial = document.createElement("option");
  inicial.value = "";
  inicial.textContent = textoInicial;
  const opciones = lista.map((item) => {
    const opcion = document.createElement("option");
    opcion.value = item.id;
    opcion.textContent = describir(item);
    return opcion;
  });
  select.replaceChildren(inicial, ...opciones);
  select.value = buscarPorId(lista, seleccionado) ? seleccionado : "";
}

function refrescarOpcionesVenta() {
  completarOpcionesVenta(document.getElementById("venta-cliente"), CLIENTES, "Seleccione un cliente…", (cliente) => `${cliente.nombreCompleto} (${cliente.id})`);
  completarOpcionesVenta(document.getElementById("venta-libro"), LIBROS, "Seleccione un libro…", (libro) => `${libro.titulo} (${libro.id})`);
}

function mostrarErroresVenta(errores, enfocar = false) {
  const contenedor = document.getElementById("ventas-errores");
  contenedor.replaceChildren();
  if (errores.length) {
    mostrarErrores(contenedor, errores);
    if (enfocar) contenedor.focus();
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
  borradorVenta.renglones = actual.renglones;
}

function actualizarImportesVenta() {
  const calculo = calcularVenta(borradorVenta.renglones, LIBROS);
  document.querySelectorAll("#venta-cuerpo tr").forEach((fila, indice) => {
    const renglon = borradorVenta.renglones[indice];
    const individual = calcularVenta([renglon], LIBROS);
    const cantidad = fila.querySelector(".cantidad-renglon");
    cantidad.setAttribute("aria-invalid", String(cantidadVenta(renglon.cantidad) === null));
    const importe = individual.renglones[0];
    fila.querySelector(".precio-renglon").textContent = importe ? formatearCentavosVenta(importe.precioUnitarioCentavos) : "Pendiente de corrección";
    fila.querySelector(".subtotal-renglon").textContent = importe ? formatearCentavosVenta(importe.subtotalCentavos) : "Pendiente de corrección";
  });
  document.getElementById("venta-total").textContent = calculo.errores.length ? "Pendiente de corrección" : formatearCentavosVenta(calculo.totalCentavos);
  return calculo;
}

function renderizarBorradorVenta() {
  const filas = borradorVenta.renglones.map((renglon, indice) => {
    const libro = buscarPorId(LIBROS, renglon.libroId);
    const titulo = libro ? libro.titulo : "Libro inexistente";
    const fila = document.createElement("tr");
    fila.dataset.libroId = renglon.libroId;
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
    cantidad.step = "1";
    cantidad.inputMode = "numeric";
    cantidad.value = renglon.cantidad;
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
    fila.append(crearCeldaTabla(`${titulo} (${renglon.libroId})`), celdaCantidad, precio, subtotal, accion);
    return fila;
  });
  document.getElementById("venta-cuerpo").replaceChildren(...filas);
  document.getElementById("venta-vacio").hidden = filas.length > 0;
  actualizarImportesVenta();
}

function mostrarDetalleVenta(venta) {
  const contenedor = document.getElementById("historial-detalle");
  const titulo = document.createElement("h2");
  titulo.id = "historial-detalle-titulo";
  titulo.tabIndex = -1;
  titulo.textContent = `Detalle de ${venta.id}`;
  const datos = document.createElement("p");
  datos.textContent = `${new Date(venta.fecha).toLocaleString("es-AR")} · ${venta.cliente.nombreCompleto} (${venta.cliente.id}) · ${venta.cliente.email}`;
  const envoltura = document.createElement("div");
  envoltura.className = "table-wrap";
  const tabla = document.createElement("table");
  tabla.className = "table";
  tabla.setAttribute("aria-labelledby", titulo.id);
  const encabezado = document.createElement("thead");
  const filaEncabezado = document.createElement("tr");
  ["Libro", "ISBN", "Cantidad", "Precio unitario", "Subtotal"].forEach((texto) => {
    const celda = document.createElement("th");
    celda.scope = "col";
    celda.textContent = texto;
    filaEncabezado.append(celda);
  });
  encabezado.append(filaEncabezado);
  const cuerpo = document.createElement("tbody");
  venta.renglones.forEach((renglon) => {
    const fila = document.createElement("tr");
    fila.append(crearCeldaTabla(`${renglon.titulo} (${renglon.libroId})`), crearCeldaTabla(renglon.isbn), crearCeldaTabla(renglon.cantidad), crearCeldaTabla(formatearCentavosVenta(renglon.precioUnitarioCentavos)), crearCeldaTabla(formatearCentavosVenta(renglon.subtotalCentavos)));
    cuerpo.append(fila);
  });
  tabla.append(encabezado, cuerpo);
  envoltura.append(tabla);
  const total = document.createElement("p");
  total.className = "venta-total";
  total.textContent = `Total: ${formatearCentavosVenta(venta.totalCentavos)}`;
  contenedor.replaceChildren(titulo, datos, envoltura, total);
  contenedor.hidden = false;
  titulo.focus();
}

function renderizarHistorialVentas() {
  const filas = VENTAS.map((venta) => {
    const fila = document.createElement("tr");
    const accion = document.createElement("td");
    const detalle = document.createElement("button");
    detalle.type = "button";
    detalle.className = "button button--secondary";
    detalle.textContent = "Ver detalle";
    detalle.setAttribute("aria-label", `Ver detalle de ${venta.id}`);
    detalle.addEventListener("click", () => mostrarDetalleVenta(venta));
    accion.append(detalle);
    fila.append(crearCeldaTabla(venta.id), crearCeldaTabla(new Date(venta.fecha).toLocaleString("es-AR")), crearCeldaTabla(venta.cliente.nombreCompleto), crearCeldaTabla(formatearCentavosVenta(venta.totalCentavos)), accion);
    return fila;
  });
  document.getElementById("historial-cuerpo").replaceChildren(...filas);
  document.getElementById("historial-vacio").hidden = filas.length > 0;
}

function iniciarVentas() {
  refrescarOpcionesVenta();
  renderizarBorradorVenta();
  renderizarHistorialVentas();
  document.addEventListener("libros-actualizados", refrescarOpcionesVenta);
  document.addEventListener("clientes-actualizados", refrescarOpcionesVenta);
  document.getElementById("venta-cliente").addEventListener("change", () => {
    borradorVenta.clienteId = document.getElementById("venta-cliente").value;
    marcarAriaInvalid(["venta-cliente"], new Set(buscarPorId(CLIENTES, borradorVenta.clienteId) ? [] : ["venta-cliente"]));
  });
  document.getElementById("venta-agregar").addEventListener("click", () => {
    sincronizarBorradorVenta();
    limpiarMensaje(document.getElementById("ventas-mensaje"));
    const libroId = document.getElementById("venta-libro").value;
    const cantidad = document.getElementById("venta-cantidad").value;
    const resultado = agregarRenglonVenta(borradorVenta, LIBROS, libroId, cantidad);
    marcarAriaInvalid(["venta-libro", "venta-cantidad"], new Set([
      ...(!buscarPorId(LIBROS, libroId) ? ["venta-libro"] : []),
      ...(cantidadVenta(cantidad) === null ? ["venta-cantidad"] : []),
    ]));
    mostrarErroresVenta(resultado.errores);
    if (!resultado.errores.length) {
      renderizarBorradorVenta();
      document.getElementById("venta-libro").value = "";
      document.getElementById("venta-cantidad").value = "1";
      document.getElementById("venta-libro").focus();
    }
  });
  document.getElementById("form-venta").addEventListener("submit", (evento) => {
    evento.preventDefault();
    sincronizarBorradorVenta();
    limpiarMensaje(document.getElementById("ventas-mensaje"));
    actualizarImportesVenta();
    const clienteValido = buscarPorId(CLIENTES, borradorVenta.clienteId);
    marcarAriaInvalid(["venta-cliente"], new Set(clienteValido ? [] : ["venta-cliente"]));
    const resultado = confirmarVenta(borradorVenta, LIBROS, CLIENTES, VENTAS);
    mostrarErroresVenta(resultado.errores, true);
    if (resultado.errores.length) return;
    const persistido = persistirEstadoBiblioteca(VENTAS);
    document.getElementById("venta-cliente").value = "";
    document.getElementById("venta-libro").value = "";
    document.getElementById("venta-cantidad").value = "1";
    marcarAriaInvalid(["venta-libro", "venta-cantidad", "venta-cliente"], new Set());
    renderizarBorradorVenta();
    renderizarHistorialVentas();
    const mensaje = document.getElementById("ventas-mensaje");
    mensaje.classList.add(persistido ? "message--info" : "message--warning");
    mensaje.textContent = persistido
      ? `Venta ${resultado.venta.id} confirmada por ${formatearCentavosVenta(resultado.venta.totalCentavos)}. Podés consultar su detalle en Historial o iniciar otra venta.`
      : `Venta ${resultado.venta.id} confirmada, pero no se pudo guardar en este navegador.`;
    document.getElementById("venta-cliente").focus();
  });
}

document.addEventListener("DOMContentLoaded", iniciarVentas);
