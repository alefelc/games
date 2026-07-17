# ¿Te animás? — Frontend 2.12.0

PWA React + TypeScript con catálogo en vivo, filtros dinámicos y dirección adaptativa opcional.

## Comandos

```bash
npm ci
npm test
npm run build
```

## Variables

Copiar `.env.example` y ajustar los dominios. En producción el navegador usa `/api/game-master`; Nginx reenvía esa ruta al servicio adaptativo para evitar problemas de CORS y configuraciones PWA antiguas.

## Cambios de esta versión

- distingue IA activa, modo local elegido y recuperación temporal;
- comprueba `/health` del servicio adaptativo;
- vuelve a intentar la IA en cada carta tras un fallo temporal;
- consume `pc_filters` y elimina límites hardcodeados;
- aplica historial persistente y cobertura de objetos seleccionados;
- integra los campos nuevos de elementos y juguetes;
- añade límite de error global;
- renueva nombres de caché PWA.
