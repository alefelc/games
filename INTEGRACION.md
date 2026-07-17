# Integración 2.13.2

## Dirección adaptativa

El frontend intenta la URL declarada en `VITE_GAME_MASTER_URL` y la ruta del mismo origen `/api/game-master`.

Variables:

```text
VITE_GAME_MASTER_URL=https://DOMINIO-API
GAME_MASTER_UPSTREAM=https://DOMINIO-API
```

`VITE_GAME_MASTER_URL` es una variable de compilación. Cambiarla exige reconstruir el frontend.

## Contrato requerido

La API debe informar en `/health`:

```json
{
  "version": "1.8.3",
  "request_contract": "v6-scene-role-normalized"
}
```

El frontend convierte cualquier valor de `gm_scene_role` a uno de:

```text
starter | bridge | continuation | climax | recovery | closer
```

La API 1.8.3 vuelve a normalizarlo de forma defensiva.
