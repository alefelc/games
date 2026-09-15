# Web 5.1.5-r1 — repositorio EasyPanel

Este paquete es autocontenido. Subí a GitHub todo el contenido de esta carpeta.
El repositorio debe mostrar en su raíz:

```text
Dockerfile
package.json
package-lock.json
packages/
games-main/
```

En EasyPanel configurá:

- método de construcción: Dockerfile;
- Dockerfile: `Dockerfile`;
- contexto: raíz del repositorio;
- puerto: `80`.

Los valores `VITE_*` y `BUILD_RELEASE` son argumentos de construcción porque
quedan incorporados al frontend. No coloques allí ningún token o clave privada.

## Acceso obligatorio

Desde esta versión, la aplicación no muestra la portada, la configuración ni la
partida hasta verificar una cuenta activa. Cada solicitud al Game Master envía
el token efímero de la sesión; no se guarda en `localStorage` ni en
`sessionStorage`.

Desplegá primero Game Master 5.0.3-r1 y después esta web.
