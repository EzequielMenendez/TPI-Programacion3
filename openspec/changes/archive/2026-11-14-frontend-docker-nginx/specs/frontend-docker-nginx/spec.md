# Spec Delta

## Purpose
Definir el empaquetado del frontend y el proxy de API de mismo origen para C-04.

## ADDED Requirements

### Requirement: Imagen del frontend
La imagen MUST usar `nginx:1.30-alpine`, contener los recursos de `frontend/public/` y escuchar en el puerto 80.

#### Scenario: Solicitud de recursos
- **WHEN** se inicia la imagen con un upstream válido y se solicita `/`, CSS o JavaScript
- **THEN** Nginx entrega los recursos correspondientes desde la raíz web

### Requirement: Proxy de API de mismo origen
Nginx MUST reenviar `/api/` a `API_UPSTREAM` reemplazando ese prefijo por `/`, conservando el resto de la ruta y la consulta; MUST enviar Host, X-Real-IP, X-Forwarded-For y X-Forwarded-Proto.

#### Scenario: Colección con consulta
- **WHEN** el navegador solicita `/api/libros/?limit=20`
- **THEN** el backend recibe `/libros/?limit=20` y el navegador usa el mismo origen que el frontend

### Requirement: Sustitución de entorno acotada
La imagen MUST limitar envsubst a `API_UPSTREAM` y conservar las variables internas de Nginx.

#### Scenario: Generación de configuración
- **WHEN** arranca el contenedor con `API_UPSTREAM` configurado
- **THEN** se sustituye el upstream y se preservan `$uri`, `$host`, `$remote_addr`, `$proxy_add_x_forwarded_for` y `$scheme`
