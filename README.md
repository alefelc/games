# ¿Te animás? — Frontend 2.13.5 r10

Esta revisión convierte la opción de Analytics en una integración funcional con Google Analytics 4.

## Publicación

Subir el contenido de este directorio a la raíz del repositorio del frontend y reconstruir la aplicación.

## Configuración previa

Ejecutar `Ejecutar-Actualizacion-Analytics.bat` desde el instalador incluido en el paquete completo. El proceso crea el campo **Analytics Measurement Id** y permite guardar directamente el ID `G-XXXXXXXXXX`.

Después, en la configuración:

1. Completar **Analytics Measurement Id**.
2. Activar **Analytics Enabled**.
3. Guardar.

## Comprobación

- Abrir `/build-info.json` y confirmar `frontend_release: 2.13.5`.
- Abrir GA4 en tiempo real y comenzar una partida de prueba.

La API adaptativa 1.8.3 no requiere cambios.
