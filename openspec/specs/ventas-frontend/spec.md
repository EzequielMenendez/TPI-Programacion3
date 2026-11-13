# ventas-frontend Specification

## Purpose
Provee a la interfaz web de la librería el armado interactivo de borradores de venta multirrenglón contra los clientes y libros reales de la API, el envío transaccional a `POST /api/ventas/` sin incluir precios ni totales, la preservación del borrador ante rechazos del servidor y la consulta paginada del historial y detalle de ventas con precios históricos congelados.

## Requirements

### Requirement: Carga reactiva de selectores de cliente y libro desde la API
El sistema SHALL poblar los selectores de cliente (`#venta-cliente`) y libro (`#venta-libro`) consultando `GET /api/clientes/` y `GET /api/libros/` mediante el cliente HTTP centralizado, y actualizará ambas listas al recibir los eventos de alta de clientes o libros sin alterar el borrador de venta en curso.

#### Scenario: Carga inicial de clientes y libros disponibles
- **WHEN** se inicializa la vista de ventas
- **THEN** el sistema consulta `GET /api/clientes/?limit=100&offset=0` y `GET /api/libros/?limit=100&offset=0`
- **AND** renderiza las opciones de `#venta-cliente` con nombre y email y las de `#venta-libro` con título, precio y stock disponible usando `textContent`

#### Scenario: Sincronización de selectores tras un alta sin perder el borrador
- **WHEN** se dispara `clientes-actualizados` o `libros-actualizados` mientras existe un borrador con renglones cargados
- **THEN** el sistema actualiza las opciones del selector correspondiente e incorpora el nuevo registro sin vaciar ni modificar los renglones ni el cliente seleccionado en el borrador

### Requirement: Confección y validación del borrador multirrenglón
El sistema SHALL permitir seleccionar un cliente, agregar libros con cantidades enteras positivas (`1` a `10000`), modificar la cantidad de cualquier renglón o quitarlo, impidiendo que un mismo libro figure en más de un renglón dentro del mismo borrador.

#### Scenario: Adición, edición de cantidad y eliminación de renglón
- **WHEN** la persona usuaria agrega un libro con cantidad `2`, luego cambia la cantidad del renglón a `3` y finalmente pulsa "Quitar"
- **THEN** la tabla del borrador (`#venta-cuerpo`) y el total (`#venta-total`) recalculan los subtotales en cada paso y quedan vacíos al quitar el único renglón

#### Scenario: Rechazo de libro duplicado en el mismo borrador
- **WHEN** la persona usuaria intenta agregar al borrador un libro que ya posee un renglón cargado
- **THEN** el sistema muestra un mensaje de error en `#ventas-errores` (`role="alert"`) indicando que el libro ya está en la venta y conserva sin cambios los renglones existentes

### Requirement: Envío transaccional sin precios ni totales
El sistema SHALL enviar la confirmación de venta mediante `POST /api/ventas/` incluyendo únicamente `cliente_id` (entero) y `renglones` (`[{ libro_id, cantidad }]`), sin enviar precios unitarios, subtotales ni total, y deshabilitará el botón `#venta-confirmar` mientras la petición esté en curso.

#### Scenario: Confirmación exitosa con respuesta 201 Created
- **WHEN** la persona usuaria confirma un borrador válido con cliente y al menos un renglón
- **THEN** el sistema deshabilita `#venta-confirmar`, envía `POST /api/ventas/` con `{ cliente_id, renglones: [{ libro_id, cantidad }] }`
- **AND** al recibir `201 Created` limpia el borrador, muestra en `#ventas-mensaje` (`role="status"`) los precios unitarios copiados del catálogo, los subtotales y el total devueltos por la API, y actualiza el historial y el detalle

### Requirement: Preservación del borrador ante errores 409 o 422
El sistema SHALL conservar intactos el cliente seleccionado y todos los renglones del borrador cuando `POST /api/ventas/` responda con error (`409 Conflict`, `422 Unprocessable Entity` o fallo de red), mostrando los mensajes del servidor en `#ventas-errores` (`role="alert"`).

#### Scenario: Rechazo 409 por stock insuficiente o entidad inexistente
- **WHEN** `POST /api/ventas/` responde con `409 Conflict` (por ejemplo, `"Stock insuficiente para el libro..."` o cliente/libro inexistente)
- **THEN** el sistema muestra el mensaje de `detail` en `#ventas-errores` (`role="alert"`) y mantiene en pantalla el cliente seleccionado y todos los renglones con sus cantidades para que la persona usuaria pueda corregirlos

#### Scenario: Rechazo 422 por validación del cuerpo
- **WHEN** `POST /api/ventas/` responde con `422 Unprocessable Entity`
- **THEN** el sistema formatea los mensajes de validación en `#ventas-errores` (`role="alert"`) y preserva el borrador sin vaciarlo

### Requirement: Consulta paginada de historial y detalle con precios históricos inmutables
El sistema SHALL consultar el historial de ventas mediante `GET /api/ventas/` con `limit` y `offset`, y al seleccionar una venta consultará `GET /api/ventas/{id}` para mostrar fecha, cliente (`nombre` y `email`), renglones e importes históricos (`precio_unitario`, `subtotal`, `total`) tal como quedaron congelados al registrarse la venta.

#### Scenario: Navegación de páginas del historial y apertura de detalle
- **WHEN** la persona usuaria consulta la sección `#historial` o cambia de página y pulsa "Ver detalle" sobre una venta
- **THEN** el sistema solicita `GET /api/ventas/?limit=20&offset=0` para la tabla y `GET /api/ventas/{id}` para el panel `#historial-detalle`, mostrando cada renglón con el título, cantidad, `precio_unitario` y `subtotal` devueltos por el servidor

#### Scenario: Inmutabilidad de importes históricos tras cambio de precio en catálogo
- **WHEN** se modifica el precio de un libro en el catálogo (`PATCH /api/libros/{id}`) después de haber confirmado una venta de ese libro
- **THEN** al abrir `GET /api/ventas/{id}` en `#historial-detalle`, el sistema muestra el `precio_unitario`, `subtotal` y `total` originales de la venta sin verse afectados por el nuevo precio del libro
