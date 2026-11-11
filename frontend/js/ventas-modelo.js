/* Reglas E5/E6: cálculos en centavos y ventas restauradas como snapshots. */
const VENTAS = ESTADO_BIBLIOTECA_INICIAL ? ESTADO_BIBLIOTECA_INICIAL.estado.ventas : [];
const borradorVenta = { clienteId: "", renglones: [] };

function cantidadVenta(valor) {
  if ((typeof valor !== "number" && typeof valor !== "string") || String(valor).trim() === "") return null;
  const cantidad = Number(valor);
  return Number.isSafeInteger(cantidad) && cantidad > 0 ? cantidad : null;
}

function precioVentaCentavos(precio) {
  if (typeof precio !== "number" || !Number.isFinite(precio) || precio <= 0) return null;
  // Desplazar el exponente evita el error binario de 10.075 * 100.
  const [coeficiente, exponente = "0"] = String(precio).split("e");
  const centavos = Math.round(Number(`${coeficiente}e${Number(exponente) + 2}`));
  return Number.isSafeInteger(centavos) && centavos > 0 ? centavos : null;
}

/** Intl recibe una cadena decimal exacta, incluso cerca del límite seguro. */
function formatearCentavosVenta(centavos) {
  const digitos = String(centavos).padStart(3, "0");
  return formatoPrecio.format(`${digitos.slice(0, -2)}.${digitos.slice(-2)}`);
}

/** Reconstruye importes desde los ids actuales; no modifica las entradas. */
function calcularVenta(renglones, libros) {
  const errores = [];
  const calculados = [];
  const vistos = new Set();
  let totalCentavos = 0;
  renglones.forEach((renglon, indice) => {
    const libro = buscarPorId(libros, renglon.libroId);
    const cantidad = cantidadVenta(renglon.cantidad);
    const precioUnitarioCentavos = libro ? precioVentaCentavos(libro.precio) : null;
    const etiqueta = `Renglón ${indice + 1}`;
    if (!libro) errores.push(`${etiqueta}: el libro seleccionado no existe.`);
    if (vistos.has(renglon.libroId)) errores.push(`${etiqueta}: el libro ya está en la venta; modificá su cantidad.`);
    vistos.add(renglon.libroId);
    if (cantidad === null) errores.push(`${etiqueta}: la cantidad debe ser un entero mayor que cero y seguro.`);
    if (libro && precioUnitarioCentavos === null) errores.push(`${etiqueta}: el precio del libro no es válido para una venta.`);
    if (!libro || cantidad === null || precioUnitarioCentavos === null) return;
    const subtotalCentavos = cantidad * precioUnitarioCentavos;
    if (!Number.isSafeInteger(subtotalCentavos) || !Number.isSafeInteger(totalCentavos + subtotalCentavos)) {
      errores.push(`${etiqueta}: el importe supera el límite numérico seguro.`);
      return;
    }
    totalCentavos += subtotalCentavos;
    calculados.push({ libroId: libro.id, titulo: libro.titulo, isbn: libro.isbn, cantidad, precioUnitarioCentavos, subtotalCentavos });
  });
  return { errores, renglones: calculados, totalCentavos: errores.length ? null : totalCentavos };
}

function agregarRenglonVenta(borrador, libros, libroId, cantidad) {
  const nuevos = [...borrador.renglones, { libroId, cantidad }];
  const resultado = calcularVenta(nuevos, libros);
  if (!resultado.errores.length) borrador.renglones.push({ libroId, cantidad: cantidadVenta(cantidad) });
  return resultado;
}

function modificarCantidadVenta(borrador, libros, libroId, cantidad) {
  const renglon = borrador.renglones.find((item) => item.libroId === libroId);
  if (!renglon) return { errores: ["El renglón seleccionado no existe."] };
  const nuevos = borrador.renglones.map((item) => item === renglon ? { libroId, cantidad } : item);
  const resultado = calcularVenta(nuevos, libros);
  if (!resultado.errores.length) renglon.cantidad = cantidadVenta(cantidad);
  return resultado;
}

function quitarRenglonVenta(borrador, libroId) {
  const indice = borrador.renglones.findIndex((item) => item.libroId === libroId);
  if (indice === -1) return false;
  borrador.renglones.splice(indice, 1);
  return true;
}

/** Construye copias completas antes de mutar historial o limpiar el borrador. */
function confirmarVenta(borrador, libros, clientes, historial, fecha = new Date().toISOString()) {
  const cliente = buscarPorId(clientes, borrador.clienteId);
  const resultado = calcularVenta(borrador.renglones, libros);
  const errores = [...resultado.errores];
  if (!cliente) errores.push("Debe seleccionar un cliente existente.");
  if (!borrador.renglones.length) errores.push("Agregá al menos un libro a la venta.");
  if (errores.length) return { errores };
  const venta = {
    id: siguienteIdPrefijado(historial, "VE"),
    fecha,
    cliente: { id: cliente.id, nombreCompleto: cliente.nombreCompleto, email: cliente.email },
    renglones: resultado.renglones.map((renglon) => ({ ...renglon })),
    totalCentavos: resultado.totalCentavos,
  };
  historial.push(venta);
  borrador.clienteId = "";
  borrador.renglones = [];
  return { errores: [], venta };
}
