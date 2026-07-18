# ¿Te animás? — Frontend 2.13.8 r13

Esta revisión hace que GA4 funcione incluso cuando el token del panel no puede crear campos.

## Publicación

Subir el contenido de este directorio a la raíz del repositorio del frontend y reconstruir la aplicación.

## Configuración de Analytics

`Analytics Enabled` se controla desde el panel. El ID se puede suministrar de tres formas:

1. Campo **Analytics Measurement Id**, cuando existe.
2. `public/runtime-config.js`.
3. Variable `GA4_MEASUREMENT_ID` en el contenedor.

La opción recomendada en EasyPanel es:

```env
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

Después, reiniciar o redesplegar el servicio.

## Comprobación

- Abrir `/build-info.json` y confirmar `frontend_release: 2.13.8`.
- Abrir `/runtime-config.js` y comprobar el ID.
- Activar **Analytics Enabled**.
- Revisar GA4 en tiempo real durante una partida de prueba.

`runtime-config.js` queda fuera de la caché de la PWA para permitir cambios inmediatos.
