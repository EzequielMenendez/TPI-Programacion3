/*
 * Utilidades compartidas de los formularios y las tablas (Ejercicio 4).
 *
 * Todo texto se inserta con textContent para que los datos del usuario se
 * muestren como texto plano.
 */

/**
 * Devuelve el siguiente id de una serie prefijada, por ejemplo LI-7 después
 * de LI-6. Calcula el mayor sufijo numérico de los ids existentes (no usa
 * la cantidad de elementos) para que la numeración no se rompa.
 */
function siguienteIdPrefijado(lista, prefijo) {
  const patron = new RegExp(`^${prefijo}-(\\d+)$`);
  let mayor = 0;
  lista.forEach((item) => {
    const coincidencia = patron.exec(item.id);
    if (coincidencia) {
      const sufijo = Number(coincidencia[1]);
      if (sufijo > mayor) {
        mayor = sufijo;
      }
    }
  });
  return `${prefijo}-${mayor + 1}`;
}

/** Crea una celda <td> de tabla con el texto indicado. */
function crearCeldaTabla(texto) {
  const celda = document.createElement("td");
  celda.textContent = texto;
  return celda;
}

/**
 * Dibuja la lista de errores (una entrada por ítem) dentro del contenedor.
 * El contenedor tiene role="alert" en el HTML: el navegador lo anuncia.
 */
function mostrarErrores(contenedor, errores) {
  const lista = document.createElement("ul");
  lista.className = "lista-errores";
  errores.forEach((texto) => {
    const item = document.createElement("li");
    item.textContent = texto;
    lista.append(item);
  });
  contenedor.replaceChildren(lista);
}

/** Vacía el mensaje de resultado y le quita las clases de tono. */
function limpiarMensaje(mensaje) {
  mensaje.replaceChildren();
  mensaje.classList.remove("message--info", "message--warning");
}

/**
 * Marca con aria-invalid="true" solo los campos de la lista que estén en
 * `camposInvalidos`; al resto les quita el atributo.
 */
function marcarAriaInvalid(idsCampos, camposInvalidos) {
  idsCampos.forEach((id) => {
    const campo = document.getElementById(id);
    if (!campo) {
      return;
    }
    if (camposInvalidos.has(id)) {
      campo.setAttribute("aria-invalid", "true");
    } else {
      campo.removeAttribute("aria-invalid");
    }
  });
}
