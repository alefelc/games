# Te Animás? PWA v2.2.4 — teanimas.com

Frontend React + TypeScript preparado para consumir el snapshot público seguro de Directus:

```text
GET /items/pc_public_bundle
```

No requiere ni incluye tokens de Directus.

## Corrección v2.2.4 para EasyPanel

Esta versión corrige dos problemas del paquete anterior:

1. La etapa de build ya no usa `node:22-alpine`; usa `node:22-bookworm-slim`.
2. `package-lock.json` ya no contiene URLs del registro interno usado durante la generación del proyecto. Todas las dependencias apuntan al registro público oficial de npm.

## Despliegue en EasyPanel

Subí el contenido de esta carpeta a la raíz del repositorio. Deben verse directamente:

```text
Dockerfile
package.json
package-lock.json
.npmrc
.dockerignore
src/
public/
deploy/
```

En EasyPanel:

- Método: Dockerfile
- Puerto interno: `80`
- Dominio: `census.ar`
- Build context: raíz del repositorio

No hace falta agregar un token de Directus.

## Desarrollo local

```powershell
npm ci
npm run test
npm run dev
```

## Build local

```powershell
npm run build
```

## Publicar cambios de contenido

Después de editar contenido en Directus:

```powershell
node .\publish-public-bundle.mjs
node .\validate-public-api.mjs
```


## Corrección de ejecución v2.2.4

Se eliminó un bucle de carga causado por la suscripción al store completo de Zustand. Ver `CORRECCION-PANTALLA-V2.2.4.md`.
