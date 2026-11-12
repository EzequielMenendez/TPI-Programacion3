/*
 * Cliente HTTP de la librería (Global · integración con la API).
 *
 * Único lugar donde se arma la URL y se llama a fetch. La base pública es
 * /api: Nginx reenvía /api/libros/ a FastAPI como /libros/. Las rutas se
 * escriben tal como las publica el backend, con su barra final cuando la
 * traen ("/libros/", "/clientes/") y sin ella en las consultas por id
 * ("/autores/3").
 *
 * Toda respuesta que no sea 2xx (y todo fallo de red) se convierte en un
 * ErrorApi con mensajes listos para mostrar junto al formulario.
 */

const API_BASE = "/api";

class ErrorApi extends Error {
  /**
   * @param {number} status  Código HTTP; 0 si no hubo respuesta (sin conexión).
   * @param {string[]} mensajes  Textos para mostrar al usuario.
   */
  constructor(status, mensajes) {
    super(mensajes.join(" "));
    this.name = "ErrorApi";
    this.status = status;
    this.mensajes = mensajes;
  }
}

/** Nombre legible del campo de un error 422: ["body","autores",0,"rol"] -> "autores[0].rol". */
function describirUbicacionApi(loc) {
  if (!Array.isArray(loc)) return "";
  return loc
    .filter((parte, indice) => !(indice === 0 && ["body", "query", "path"].includes(parte)))
    .reduce((texto, parte) => {
      if (typeof parte === "number") return `${texto}[${parte}]`;
      return texto === "" ? String(parte) : `${texto}.${parte}`;
    }, "");
}

/**
 * Extrae los mensajes del servidor. FastAPI responde {"detail": "texto"} en
 * los errores de dominio (404, 409) y {"detail": [{loc, msg}, …]} en los 422.
 */
function mensajesDeErrorApi(status, cuerpo) {
  const detalle = cuerpo && typeof cuerpo === "object" ? cuerpo.detail : null;
  if (typeof detalle === "string" && detalle.trim() !== "") {
    return [detalle];
  }
  if (Array.isArray(detalle) && detalle.length > 0) {
    return detalle.map((item) => {
      const campo = describirUbicacionApi(item && item.loc);
      const texto = item && typeof item.msg === "string" ? item.msg : "Dato inválido.";
      return campo === "" ? texto : `${campo}: ${texto}`;
    });
  }
  return [`El servidor respondió con un error (${status}).`];
}

/**
 * Hace una petición a la API y devuelve el JSON de la respuesta.
 *
 * @param {string} ruta  Ruta del backend, por ejemplo "/libros/" o "/autores/3".
 * @param {{metodo?: string, parametros?: object, cuerpo?: object}} [opciones]
 * @returns {Promise<{status: number, datos: any}>}
 * @throws {ErrorApi}
 */
async function apiFetch(ruta, opciones = {}) {
  const { metodo = "GET", parametros = null, cuerpo = null } = opciones;

  let url = `${API_BASE}${ruta}`;
  if (parametros) {
    const consulta = new URLSearchParams();
    Object.entries(parametros).forEach(([clave, valor]) => {
      if (valor !== null && valor !== undefined && valor !== "") {
        consulta.set(clave, String(valor));
      }
    });
    const texto = consulta.toString();
    if (texto !== "") url += `?${texto}`;
  }

  const configuracion = { method: metodo, headers: { Accept: "application/json" } };
  if (cuerpo !== null) {
    configuracion.headers["Content-Type"] = "application/json";
    configuracion.body = JSON.stringify(cuerpo);
  }

  let respuesta;
  try {
    respuesta = await fetch(url, configuracion);
  } catch {
    throw new ErrorApi(0, ["No se pudo conectar con el servidor. Revisá la conexión y volvé a intentar."]);
  }

  let datos = null;
  try {
    datos = await respuesta.json();
  } catch {
    datos = null; // Respuesta sin cuerpo JSON (por ejemplo, un 502 del proxy).
  }

  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, mensajesDeErrorApi(respuesta.status, datos));
  }
  return { status: respuesta.status, datos };
}

/** Mensajes para mostrar a partir de cualquier error atrapado. */
function mensajesDeError(error) {
  if (error instanceof ErrorApi) return error.mensajes;
  return ["Ocurrió un error inesperado. Volvé a intentar."];
}
