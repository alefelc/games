# ¿Te animás? — frontend con Game Master v2.8.0

## Cambios

- Opción **Game Master adaptativo** en la configuración.
- La selección se realiza únicamente entre cartas ya compatibles con niveles, sexos, mazos, elementos, juguetes y límites.
- Reacciones rápidas después de cada carta:
  - Me gustó.
  - Más intenso.
  - Bajar.
  - Similar.
- Mensajes breves del anfitrión.
- Si el servicio no responde, la partida continúa con la selección local.

## Variable requerida

```env
VITE_GAME_MASTER_URL=https://gm.census.ar
```

La clave de OpenAI no se coloca en este proyecto.
