# 2.13.10 — R15

- El ID de GA4 se configura exclusivamente desde `pc_app_settings.analytics_measurement_id`.
- Se elimina el ID integrado en el bundle y cualquier fallback runtime.
- Analytics no carga si el interruptor está apagado o el campo no contiene un ID `G-...` válido.
- Se incluye una migración de Directus para crear el campo visible junto a `Analytics Enabled`.

# 2.13.9 — R14

- GA4 `G-8CMSB2VYC8` queda integrado en el bundle del frontend.
- `Analytics Enabled` es el único interruptor necesario.
- Se elimina la dependencia de scripts PowerShell, permisos de esquema, slug y `runtime-config.js`.
- `runtime-config.js` se conserva únicamente como diagnóstico estático.

# Changelog

## 2.13.8 — Analytics R13

- El actualizador deja de depender del slug `te-animas`.
- La configuración runtime se genera antes de consultar Directus.
- Si existe una sola fila de `pc_app_settings`, se utiliza directamente.
- Los problemas de permisos o selección se convierten en advertencias y no cancelan GA4.

## 2.13.7 — Analytics R12

- El ID runtime de GA4 tiene prioridad sobre valores remotos anteriores.
- `runtime-config.js` queda preparado con `G-8CMSB2VYC8`.
- El actualizador ya no consulta endpoints `/fields`.

## 2.13.6 — Analytics sin permisos de esquema

- GA4 puede tomar el ID desde `GA4_MEASUREMENT_ID` en el contenedor.
- También admite `public/runtime-config.js` y conserva el campo remoto como alternativa.
- `Analytics Enabled` sigue siendo el interruptor maestro.
- Ya no es obligatorio dar permisos para modificar el modelo de datos.

# Historial anterior — Frontend 2.13.5 r10

## Analytics GA4 funcional

- `Analytics Enabled` ahora activa y desactiva realmente Google Analytics 4.
- Se agregó `Analytics Measurement Id` para guardar el identificador `G-XXXXXXXXXX`.
- GA4 se carga de forma dinámica únicamente cuando ambas configuraciones son válidas.
- Se registran aperturas, pantallas y acciones generales de partida.
- No se envían nombres, textos de cartas, límites, elementos, juguetes ni respuestas íntimas.
- El frontend sigue funcionando aunque el campo todavía no haya sido creado.

## Corrección incluida de r9

- El bloque **Ritmo de la partida** no repite el texto de la carta.
