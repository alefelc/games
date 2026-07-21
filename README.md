# ¿Te animás? Web — EasyPanel 3.0.2-r3

Este directorio es un repositorio autónomo del frontend.

## Verificación visual obligatoria

Al abrir la raíz del repositorio en GitHub deben verse directamente:

- `Dockerfile`
- `package.json`
- `package-lock.json`
- `REPOSITORY_ROOT_OK.txt`
- `contracts/`
- `src/`
- `public/`
- `deploy/`

No debe verse una carpeta contenedora llamada `games-main` ni `te-animas-release-*`.

## EasyPanel

- Build method: `Dockerfile`
- Dockerfile: `Dockerfile`
- Build context: `.`
- Puerto interno: `80`
- Healthcheck: `/`

Build argument requerido:

```text
VITE_GAME_MASTER_URL=https://gm.teanimas.com
```

Opcionales:

```text
VITE_DIRECTUS_URL=https://admin.teanimas.com
VITE_BASE_PATH=/
VITE_GAME_SLUG=te-animas
VITE_ALLOW_BOOTSTRAP_FALLBACK=true
VITE_CONTENT_CACHE_HOURS=24
BUILD_RELEASE=3.0.2-r3
```

No hay secretos en el frontend. Todo valor `VITE_*` queda incorporado al JavaScript público.
