# Integración r12

1. Ejecutar `Ejecutar-Actualizacion-Analytics.bat` con el ID GA4.
2. Publicar el frontend 2.13.7.
3. No volver a publicar la API adaptativa.
4. Confirmar que `/runtime-config.js` contiene el ID.
5. Activar **Analytics Enabled** en el panel.
6. Verificar eventos en Google Analytics 4.

Si se usa EasyPanel, también puede definirse `GA4_MEASUREMENT_ID=G-XXXXXXXXXX` en el servicio del frontend.
