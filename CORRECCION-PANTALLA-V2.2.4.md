# PecadoClub v2.2.4 — corrección de pantalla intermitente

## Problema corregido

La aplicación se quedaba en **“Preparando el juego…”** y alternaba pantallas porque
`App.tsx` se suscribía al store completo de Zustand:

```ts
const store = useGameStore();
```

Cada `setContent()` generaba un nuevo objeto `store`. Como `refresh()` dependía de ese
objeto, React volvía a ejecutar el efecto de carga. El ciclo era infinito:

```text
cargar → setContent → recrear refresh → volver a cargar
```

## Solución

- Selectores individuales y estables para cada estado/acción de Zustand.
- Una sola carga inicial.
- Cancelación con `AbortController` al desmontar.
- Protección contra respuestas fuera de orden.
- Se mantiene el Dockerfile compatible con EasyPanel.

## Actualización en GitHub

Reemplazá como mínimo:

```text
src/App.tsx
package.json
package-lock.json
Dockerfile
```

Después hacé commit y en EasyPanel ejecutá **Deploy / Rebuild sin caché**.

## Limpiar la versión anterior en el navegador

Como la aplicación es PWA, el service worker anterior puede permanecer activo.

En Chrome de escritorio:

```text
F12 → Application → Service Workers → Unregister
F12 → Application → Storage → Clear site data
```

En el celular, cerrá la aplicación instalada y borrá los datos del sitio o desinstalá
temporalmente la PWA antes de abrir la versión nueva.
