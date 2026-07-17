# Integración 2.12.0

## Catálogo

El frontend obtiene la configuración y el catálogo publicado. Incluye `pc_filters` con los campos:

```text
id,game,status,key,label,description,icon,filter_kind,card_fields,numeric_field,default_enabled,default_number,min_value,max_value,visible,advanced,sort
```

Si un bundle viejo todavía no contiene filtros, la aplicación crea temporalmente los 16 límites compatibles y continúa funcionando.

## Dirección adaptativa

En producción el navegador llama a:

```text
/api/game-master/health
/api/game-master/v1/game-master/next
```

El Nginx incluido reenvía esas rutas a `https://gm.teanimas.com/`. La preferencia del usuario se respeta:

- activada: intenta la IA en cada carta;
- desactivada: usa selección local intencional;
- error temporal: usa una carta local sólo para ese turno y vuelve a intentar la IA en el siguiente.

## Despliegue

1. Publicar primero `te-animas-game-master`.
2. Verificar `/health` y `/ready`.
3. Publicar el frontend.
4. Abrir la app en una ventana privada o borrar la PWA anterior una vez para forzar la renovación inicial del service worker.
