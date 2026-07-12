# REEMPLAZO EN GITHUB / EASYPANEL

El error del build anterior no estaba en React.

Había dos fallas en el paquete:

- `node:22-alpine` está afectado por un fallo conocido de npm que puede terminar en
  `Exit handler never called!`.
- El `package-lock.json` contenía 474 URLs de un registro interno no accesible
  desde tu servidor EasyPanel.

## Método más seguro

1. Eliminá del repositorio anterior todos los archivos.
2. Subí el contenido completo de `pecadoclub-app-census-v2.2.2`.
3. Confirmá que `Dockerfile`, `package.json` y `src` estén en la raíz.
4. En EasyPanel pulsá **Deploy** o **Rebuild**.

## Método mínimo

Reemplazá estos cinco archivos:

- Dockerfile
- package.json
- package-lock.json
- .npmrc
- .dockerignore

Después hacé commit y redeploy.

## Resultado esperado

El log debe mostrar una base como:

```text
FROM node:22-bookworm-slim AS build
```

y luego:

```text
RUN npm ci --no-audit --no-fund --prefer-online
RUN npm run build
```

No debe volver a aparecer `node:22-alpine` en la etapa de build.
