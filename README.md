# ¿Te animás? — Frontend 2.13.10 R15

## Analytics GA4

El frontend toma el ID únicamente de estos campos del registro publicado en `pc_app_settings`:

- `analytics_enabled`
- `analytics_measurement_id`

No hay un ID integrado, variable de entorno ni archivo runtime alternativo.

Cuando Analytics está desactivado, el ID está vacío o no cumple el formato `G-XXXXXXXXXX`, Google Analytics no se carga.

Antes de publicar este frontend, aplicá la migración incluida en `directus-migration-analytics-r15` para que el campo **ID de medición de Google Analytics 4** aparezca en el panel.

## Publicación

Subí el contenido de este directorio a la raíz del repositorio del frontend y reconstruí la aplicación.

## Comprobación

1. Abrí `/build-info.json` y confirmá `frontend_release: 2.13.10-r15`.
2. En el panel, activá `Analytics Enabled`.
3. Cargá el ID en **ID de medición de Google Analytics 4** y guardá.
4. Abrí el juego en una ventana privada.
5. Revisá el informe Tiempo real de GA4.
