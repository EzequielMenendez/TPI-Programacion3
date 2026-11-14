/*
 * Datos locales de la librería (Ejercicio 3).
 *
 * Todos los datos son ficticios. Cada entidad tiene un identificador estable
 * (`id`) y las relaciones se guardan por id:
 *   - libro.editorialId -> editoriales[].id (obligatoria)
 *   - libro.generoId    -> generos[].id     (opcional: null = «Sin clasificar»)
 *   - libro.autorIds    -> autores[].id     (uno o más)
 *
 * Se cargan como script clásico (no módulo) para que el proyecto funcione
 * abriendo index.html directamente desde el disco, sin servidor.
 */

const EDITORIALES = [
  { id: "ED-1", nombre: "Editorial Cordillera" },
  { id: "ED-2", nombre: "Ediciones Viñedo" },
];

const GENEROS = [
  { id: "GE-1", nombre: "Novela" },
  { id: "GE-2", nombre: "Ensayo" },
];

const AUTORES = [
  { id: "AU-1", nombre: "Lucía Benavídez" },
  { id: "AU-2", nombre: "Tomás Aguirre" },
  { id: "AU-3", nombre: "Paula Ríos" },
];

let LIBROS = [
  {
    id: "LI-1",
    titulo: "El viento del Aconcagua",
    isbn: "978-950-000-001-1",
    precio: 18500,
    editorialId: "ED-1",
    generoId: "GE-1",
    autorIds: ["AU-1"],
  },
  {
    id: "LI-2",
    titulo: "Crónicas del agua y la piedra",
    isbn: "978-950-000-002-8",
    precio: 15200.5,
    editorialId: "ED-2",
    generoId: "GE-2",
    autorIds: ["AU-2"],
  },
  {
    id: "LI-3",
    titulo: "La casa de los viñedos",
    isbn: "978-950-000-003-5",
    precio: 21000,
    editorialId: "ED-2",
    generoId: "GE-1",
    autorIds: ["AU-1", "AU-3"],
  },
  {
    id: "LI-4",
    titulo: "Pensar la ciudad",
    isbn: "978-950-000-004-2",
    precio: 12750,
    editorialId: "ED-1",
    generoId: "GE-2",
    autorIds: ["AU-3"],
  },
  {
    id: "LI-5",
    titulo: "Cuaderno de viaje",
    isbn: "978-950-000-005-9",
    precio: 9900,
    editorialId: "ED-1",
    generoId: null, // Sin género asignado: se muestra «Sin clasificar».
    autorIds: ["AU-2"],
  },
  {
    id: "LI-6",
    titulo: "Noches de vendimia",
    isbn: "978-950-000-006-6",
    precio: 16300,
    editorialId: "ED-2",
    generoId: "GE-1",
    autorIds: ["AU-2", "AU-3"],
  },
];

let CLIENTES = [
  { id: "CL-1", nombreCompleto: "Ana Gómez", email: "ana.gomez@ejemplo.com" },
  { id: "CL-2", nombreCompleto: "Bruno Pérez", email: "bruno.perez@ejemplo.com" },
  { id: "CL-3", nombreCompleto: "Carla Sosa", email: "carla.sosa@ejemplo.com" },
];

/* Persistencia local E6. El sobre único evita restaurar colecciones de épocas
 * distintas y las semillas se copian para que nunca se muten accidentalmente. */
const CLAVE_ESTADO_BIBLIOTECA = "paginas-del-sol.estado.v1";
const VERSION_ESTADO_BIBLIOTECA = 1;

function copiarEstadoBiblioteca(valor) {
  return JSON.parse(JSON.stringify(valor));
}

function crearEstadoSemillaBiblioteca() {
  return {
    version: VERSION_ESTADO_BIBLIOTECA,
    libros: copiarEstadoBiblioteca(LIBROS),
    clientes: copiarEstadoBiblioteca(CLIENTES),
    ventas: [],
  };
}

function esEstadoBibliotecaValido(estado) {
  return Boolean(
    estado
    && estado.version === VERSION_ESTADO_BIBLIOTECA
    && Array.isArray(estado.libros)
    && Array.isArray(estado.clientes)
    && Array.isArray(estado.ventas)
  );
}

function leerEstadoBiblioteca(almacenamiento = globalThis.localStorage) {
  if (!almacenamiento) return null;
  try {
    const texto = almacenamiento.getItem(CLAVE_ESTADO_BIBLIOTECA);
    if (!texto) return null;
    const estado = JSON.parse(texto);
    return esEstadoBibliotecaValido(estado) ? copiarEstadoBiblioteca(estado) : null;
  } catch {
    return null;
  }
}

function guardarEstadoBiblioteca(estado, almacenamiento = globalThis.localStorage) {
  if (!almacenamiento || !esEstadoBibliotecaValido(estado)) return false;
  try {
    almacenamiento.setItem(CLAVE_ESTADO_BIBLIOTECA, JSON.stringify(copiarEstadoBiblioteca(estado)));
    return true;
  } catch {
    return false;
  }
}

function hidratarEstadoBiblioteca(almacenamiento = globalThis.localStorage) {
  const persistido = leerEstadoBiblioteca(almacenamiento);
  if (persistido) return { origen: "persistido", estado: persistido };
  const semillas = crearEstadoSemillaBiblioteca();
  guardarEstadoBiblioteca(semillas, almacenamiento);
  return { origen: "semillas", estado: semillas };
}

function estadoActualBiblioteca(ventas) {
  return {
    version: VERSION_ESTADO_BIBLIOTECA,
    libros: copiarEstadoBiblioteca(LIBROS),
    clientes: copiarEstadoBiblioteca(CLIENTES),
    ventas: copiarEstadoBiblioteca(ventas),
  };
}

function persistirEstadoBiblioteca(ventas = (typeof VENTAS === "undefined" ? [] : VENTAS)) {
  return guardarEstadoBiblioteca(estadoActualBiblioteca(ventas));
}

let ESTADO_BIBLIOTECA_INICIAL = null;
if (!globalThis.__E6_NO_AUTOINICIALIZAR__) {
  ESTADO_BIBLIOTECA_INICIAL = hidratarEstadoBiblioteca();
  LIBROS = ESTADO_BIBLIOTECA_INICIAL.estado.libros;
  CLIENTES = ESTADO_BIBLIOTECA_INICIAL.estado.clientes;
}
