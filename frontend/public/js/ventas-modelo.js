/*
 * Modelo puro de ventas (E5/E6 y Global · Ejercicio 3 · change C-03).
 *
 * Responsabilidades:
 *   - Cálculos exactos en centavos para el borrador en memoria.
 *   - Validación del borrador antes de confirmar (cliente, al menos un renglón,
 *     cantidades enteras positivas y un único renglón por libro).
 *   - Construcción del cuerpo de POST /ventas/ únicamente con cliente_id y
 *     renglones [{ libro_id, cantidad }] (extra="forbid" en el backend).
 *   - Descripción de la respuesta 201 Created con los precios unitarios
 *     copiados del catálogo, subtotales y total devueltos por la API.
 */
const VENTAS = ESTADO_BIBLIOTECA_INICIAL ? ESTADO_BIBLIOTECA_INICIAL.estado.ventas : [];
const borradorVenta = { clienteId: "", renglones: [] };
const MAX_CANTIDAD_VENTA = 10000;

function mismoIdVenta(a, b) {
  if (a === b) return true;
  if (a === "" || b === "" || a === null || b === null || a === undefined || b === undefined) {
    return false;
  }
  return String(a) === String(b);
}

function buscarEnListaPorId(lista, id) {
  if (!Array.isArray(lista)) return null;
  return lista.find((item) => item && mismoIdVenta(item.id, id)) ?? null;
}

function cantidadVenta(valor) {
  if ((typeof valor !== "number" && typeof valor !== "string") || String(valor).trim() === "") return null;
  const cantidad = Number(valor);
  return Number.isSafeInteger(cantidad) && cantidad > 0 ? cantidad : null;
}

function precioVentaCentavos(precio) {
  const numero = typeof precio === "string" && /^\d+(\.\d+)?$/.test(precio.trim())
    ? Number(precio.trim())
    : precio;
  if (typeof numero !== "number" || !Number.isFinite(numero) || numero <= 0) return null;
  // Desplazar el exponente evita el error binario de 10.075 * 100.
  const [coeficiente, exponente = "0"] = String(numero).split("e");
  const centavos = Math.round(Number(`${coeficiente}e${Number(exponente) + 2}`));
  return Number.isSafeInteger(centavos) && centavos > 0 ? centavos : null;
}

/** Intl recibe una cadena decimal exacta, incluso cerca del límite seguro. */
function formatearCentavosVenta(centavos) {
  const digitos = String(centavos).padStart(3, "0");
  return formatoPrecio.format(`${digitos.slice(0, -2)}.${digitos.slice(-2)}`);
}

/** Formatea un importe decimal devuelto por la API ("18500.50" o número). */
function formatearImporteApi(importe) {
  const centavos = precioVentaCentavos(importe);
  if (centavos !== null) return formatearCentavosVenta(centavos);
  const numero = Number(importe);
  return Number.isFinite(numero) ? formatoPrecio.format(numero) : String(importe ?? "");
}

/** Reconstruye importes desde los ids actuales; no modifica las entradas. */
function calcularVenta(renglones, libros) {
  const errores = [];
  const calculados = [];
  const vistos = new Set();
  let totalCentavos = 0;
  renglones.forEach((renglon, indice) => {
    const libro = buscarEnListaPorId(libros, renglon.libroId);
    const claveLibro = libro ? String(libro.id) : String(renglon.libroId ?? "");
    const cantidad = cantidadVenta(renglon.cantidad);
    const precioUnitarioCentavos = libro ? precioVentaCentavos(libro.precio) : null;
    const etiqueta = `Renglón ${indice + 1}`;
    if (!libro) errores.push(`${etiqueta}: el libro seleccionado no existe.`);
    if (vistos.has(claveLibro)) errores.push(`${etiqueta}: el libro ya está en la venta; modificá su cantidad.`);
    vistos.add(claveLibro);
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
  const renglon = borrador.renglones.find((item) => mismoIdVenta(item.libroId, libroId));
  if (!renglon) return { errores: ["El renglón seleccionado no existe."] };
  const nuevos = borrador.renglones.map((item) => item === renglon ? { libroId: renglon.libroId, cantidad } : item);
  const resultado = calcularVenta(nuevos, libros);
  if (!resultado.errores.length) renglon.cantidad = cantidadVenta(cantidad);
  return resultado;
}

function quitarRenglonVenta(borrador, libroId) {
  const indice = borrador.renglones.findIndex((item) => mismoIdVenta(item.libroId, libroId));
  if (indice === -1) return false;
  borrador.renglones.splice(indice, 1);
  return true;
}

/**
 * Valida el borrador antes de enviarlo a POST /ventas/ sin mutarlo.
 * Exige cliente existente, al menos un renglón, libro único por renglón y
 * cantidades enteras entre 1 y 10000 (contrato RenglonCreate del backend).
 */
function validarBorradorVenta(borrador, libros, clientes) {
  const cliente = buscarEnListaPorId(clientes, borrador.clienteId);
  const resultado = calcularVenta(borrador.renglones, libros);
  const errores = [...resultado.errores];

  borrador.renglones.forEach((renglon, indice) => {
    const cantidad = cantidadVenta(renglon.cantidad);
    if (cantidad !== null && cantidad > MAX_CANTIDAD_VENTA) {
      errores.push(`Renglón ${indice + 1}: la cantidad admite hasta ${MAX_CANTIDAD_VENTA} unidades.`);
    }
  });

  if (!cliente) errores.push("Debe seleccionar un cliente existente.");
  if (!borrador.renglones.length) errores.push("Agregá al menos un libro a la venta.");

  return {
    errores,
    renglones: resultado.renglones,
    totalCentavos: errores.length ? null : resultado.totalCentavos,
  };
}

/**
 * Cuerpo estricto para POST /ventas/ (VentaCreate con extra="forbid"):
 * envía únicamente cliente_id y renglones [{ libro_id, cantidad }].
 */
function construirCuerpoVenta(borrador) {
  return {
    cliente_id: Number(borrador.clienteId),
    renglones: borrador.renglones.map((renglon) => ({
      libro_id: Number(renglon.libroId),
      cantidad: Number(renglon.cantidad),
    })),
  };
}

/**
 * Resume la venta confirmada (201 Created) con los precios unitarios que el
 * backend copió del catálogo, los subtotales por renglón y el total.
 */
function describirConfirmacionVenta(venta) {
  const nombreCliente = venta.cliente
    ? (venta.cliente.nombre ?? venta.cliente.nombreCompleto ?? `Cliente #${venta.cliente.id}`)
    : "";
  const detalleRenglones = Array.isArray(venta.renglones)
    ? venta.renglones
      .map((renglon) => {
        const unitario = formatearImporteApi(renglon.precio_unitario);
        const subtotal = formatearImporteApi(renglon.subtotal);
        return `${renglon.titulo} (${renglon.cantidad} × ${unitario} = ${subtotal})`;
      })
      .join("; ")
    : "";
  const total = formatearImporteApi(venta.total);
  return `Venta #${venta.id} registrada para ${nombreCliente}. Renglones: ${detalleRenglones}. Total: ${total}.`;
}

/** Construye copias completas antes de mutar historial o limpiar el borrador (compatibilidad E5/E6). */
function confirmarVenta(borrador, libros, clientes, historial, fecha = new Date().toISOString()) {
  const cliente = buscarEnListaPorId(clientes, borrador.clienteId);
  const resultado = calcularVenta(borrador.renglones, libros);
  const errores = [...resultado.errores];
  if (!cliente) errores.push("Debe seleccionar un cliente existente.");
  if (!borrador.renglones.length) errores.push("Agregá al menos un libro a la venta.");
  if (errores.length) return { errores };
  const venta = {
    id: siguienteIdPrefijado(historial, "VE"),
    fecha,
    cliente: { id: cliente.id, nombreCompleto: cliente.nombreCompleto ?? cliente.nombre, email: cliente.email },
    renglones: resultado.renglones.map((renglon) => ({ ...renglon })),
    totalCentavos: resultado.totalCentavos,
  };
  historial.push(venta);
  borrador.clienteId = "";
  borrador.renglones = [];
  return { errores: [], venta };
}
