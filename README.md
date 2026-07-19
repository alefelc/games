# ¿Te animás? — Frontend 2.15.2 R22

## Cambio principal

En **Personalizar partida → Paso 2: Niveles e intensidad**, debajo de los niveles, aparece el selector **Intensidad máxima de las cartas**, con valores del 1 al 7.

El control no depende de que `pc_filters` esté actualizado: si una instalación antigua no trae `maxIntensity`, el frontend crea la definición compatible y la aplica al filtrado real de cartas.

## Publicación

1. Construí o desplegá este directorio.
2. Usá `BUILD_RELEASE=2.15.2-r22`.
3. Borrá la caché anterior o reinstalá la PWA.
4. Abrí `/build-info.json` y confirmá `frontend_release: 2.15.2-r22`.
