# Web 5.0.1-r4 — repositorio EasyPanel

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
