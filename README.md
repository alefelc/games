# Web 5.1.7-r1 — repositorio EasyPanel

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

## Corrección de login y registro (5.1.7)

La identidad se verifica directamente en Directus (`/auth/login` y `/users/me`).
Una caída de Game Master, perfil o pareja (incluidos 500/502/503/504 y timeout)
no invalida una cuenta activa. Las preferencias de respaldo se aíslan por usuario.
El refresh inicial es único aunque React StrictMode ejecute dos efectos.
Los tokens siguen solo en memoria; el refresh usa cookie HTTP-only.

El registro sigue siendo por invitación: no activa cuentas automáticamente,
no habilita el registro público de Directus ni asigna roles desde el navegador.
Si Game Master está caído muestra un error de disponibilidad, no confirma el
envío de una invitación. Una respuesta aceptada de Directus no verifica entrega:
si el correo no llega hay que revisar los logs SMTP de Directus.

Desplegá primero **Game Master 5.0.4-r1** y después **esta web 5.1.7-r1**.
Actualizar GitHub no reemplaza el contenedor si EasyPanel no tiene autodeploy.
Actualizá también `BUILD_RELEASE` si lo sobrescribiste en Build Arguments.

Verificaciones tras desplegar:

- `https://gm.teanimas.com/health`: HTTP 200 y `version: 5.0.4`.
- `https://teanimas.com/api/game-master/health`: la misma respuesta.
- `https://teanimas.com/build-info.json`: `frontend_release: 5.1.7-r1`.
- Login con una cuenta activa: debe funcionar incluso si el perfil no responde.
- Registro: requiere `PLAYER_ROLE_ID`, permisos del token interno y SMTP;
  ver README del backend para los valores y permisos necesarios.

Pruebas de regresión de cuentas: `npm run test:auth`. Build: `npm run build`.
