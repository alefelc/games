# Web/PWA 5.1.0-r1

Frontend React del juego. Consume el catálogo validado, el dominio compartido y la API privada de cuentas, parejas e IA.

La revisión `r3` corrige el cierre falso de la partida al pedir la tercera
carta y valida un recorrido clásico completo de 20 cartas.

```bash
npm run test:web
npm run build:web
```

El build Docker debe usar la raíz del repositorio como contexto y `games-main/Dockerfile` como Dockerfile.
