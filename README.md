# ¿Te animás? — Web 3.0.0-r1

Aplicación React/PWA del juego. Se instala y construye desde la raíz del workspace, no desde esta carpeta.

```bash
npm ci
npm run test:web
npm run build:web
```

## Decisiones relevantes

- Consume el contrato compartido `@te-animas/contracts`.
- Valida respuestas de contenido e IA antes de incorporarlas al estado.
- Reemplaza modos o niveles predeterminados inexistentes por referencias válidas.
- El selector de intensidad elige un solo nivel y muestra los inferiores únicamente como progreso visual.
- Elementos y juguetes se mantienen disponibles en modo solitario cuando tienen cartas compatibles.
- Las pruebas se aíslan por archivo para terminar sin recursos pendientes.

## Docker

Usar la raíz de la release como contexto y `games-main/Dockerfile` como Dockerfile. Ver `../docs/DEPLOYMENT.md`.
