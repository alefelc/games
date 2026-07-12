# PecadoClub PWA v2.2.1 — census.ar

Frontend React + TypeScript preparado para consumir un único snapshot público seguro desde:

```text
GET /items/pc_public_bundle
```

No requiere ni incluye tokens de Directus.

## Desarrollo

```powershell
npm ci
npm run test
npm run dev
```

## Build

```powershell
npm run build
```

El resultado queda en `dist/` y está compilado para la raíz `https://census.ar/`.

## Publicar cambios de contenido

Después de editar y publicar contenido en Directus, ejecutá desde `01-directus-access`:

```powershell
node .\publish-public-bundle.mjs
```

La app compara el hash del snapshot y actualiza su caché automáticamente.
