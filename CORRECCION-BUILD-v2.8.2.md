# Corrección de compilación v2.8.2

El frontend anterior leía `VITE_GAME_MASTER_URL`, pero el Dockerfile no exponía
esa variable durante la compilación. Por eso el archivo JavaScript publicado no
contenía la dirección del Game Master aunque la variable existiera en EasyPanel.

Esta versión incluye como valor predeterminado:

`https://websites-game-master.chn0vc.easypanel.host`

También incorpora todas las variables `VITE_` necesarias en la etapa de build y
renueva las cachés de la PWA.
