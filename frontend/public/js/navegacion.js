/*
 * Navegación entre secciones de la página única (Ejercicio 1).
 *
 * Las secciones se enlazan por hash (#catalogo, #libros, #clientes).
 * Este script mantiene aria-current="page" solo en el enlace de la
 * sección activa, según el hash del momento.
 */

function marcarSeccionActiva() {
  const hashActual = window.location.hash || "#catalogo";
  document.querySelectorAll(".nav-link").forEach((enlace) => {
    if (enlace.getAttribute("href") === hashActual) {
      enlace.setAttribute("aria-current", "page");
    } else {
      enlace.removeAttribute("aria-current");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  marcarSeccionActiva();
  window.addEventListener("hashchange", marcarSeccionActiva);
});
