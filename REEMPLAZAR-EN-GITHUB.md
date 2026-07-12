# Corrección EasyPanel v2.2.3

El build anterior falló porque GitHub no recibió el archivo oculto `.npmrc`, pero el Dockerfile intentaba copiarlo.

Esta versión no depende de ningún archivo oculto. Toda la configuración de npm está dentro del Dockerfile.

## Reemplazo mínimo

Reemplazá en el repositorio:

- `Dockerfile`
- `package.json`
- `package-lock.json`

Después hacé commit y ejecutá **Deploy / Rebuild sin caché** en EasyPanel.

## Verificación

El log debe mostrar:

```text
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --prefer-online
```

No debe aparecer `.npmrc` en ninguna línea COPY.
