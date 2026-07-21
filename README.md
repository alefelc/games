# ¿Te animás? — Frontend 2.15.4 R24

- Elimina el cuadro redundante de registro de la portada.
- Renderiza “Cómo se juega” desde `pc_app_settings`.
- Usa `default_cards_per_session` como cantidad inicial de cartas.
- Mantiene `maximum_cards_per_session` como límite superior.
- Tolera instalaciones antiguas mientras se ejecuta el instalador R23.

Publicá con `BUILD_RELEASE=2.15.4-r24.0` y limpiá la caché de la PWA.

## Intensidad R24

El selector trabaja por franjas independientes: 1–2 social/pícaro, 3–4 sensual y 5–7 explícito. El bootstrap local contiene 3.090 cartas y se precachea para uso offline.
