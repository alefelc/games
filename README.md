# ¿Te animás? — Frontend 2.13.2

PWA React + TypeScript con catálogo en vivo, filtros dinámicos y dirección adaptativa opcional.

## Comandos

```bash
npm ci
npm test
npm run build
```

## Variables

Copiar `.env.example` y ajustar los dominios. En producción el navegador puede usar la URL directa configurada y también `/api/game-master`; Nginx reenvía esta última al servicio adaptativo.

## Corrección 2.13.2

- normaliza `gm_scene_role` antes de enviar cartas a la API;
- acepta valores históricos, traducidos, vacíos, nulos o personalizados;
- infiere un rol canónico usando nivel, intensidad y puntajes;
- guarda roles canónicos en el historial para evitar nuevos rechazos;
- mantiene el diagnóstico detallado de errores y rutas.

La corrección del HTTP 422 requiere API 1.8.3 o posterior. Publicar también este frontend agrega una segunda defensa y actualiza la PWA.
