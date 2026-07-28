# Corrección de `robots.txt` y `sitemap.xml`

Este paquete corrige las dos rutas que podían devolver la aplicación (`index.html`) en lugar de los archivos públicos:

1. Workbox deja de aplicar `navigateFallback` a `/robots.txt` y `/sitemap.xml`.
2. Nginx sirve ambas rutas mediante coincidencias exactas y devuelve `404` si el archivo físico no existe, en vez de ocultar el error con la SPA.

## Archivos que deben reemplazarse

Copiar el contenido del paquete respetando estas rutas del repositorio:

- `games-main/vite.config.ts`
- `games-main/deploy/default.conf.template`

Los archivos públicos ya deben existir en:

- `games-main/public/robots.txt`
- `games-main/public/sitemap.xml`

## Despliegue

En EasyPanel:

1. Confirmar que el servicio usa la rama y el commit que contienen los cambios.
2. Ejecutar **Rebuild/Redeploy**; un simple **Restart** no recompila la aplicación ni regenera el service worker.
3. Si está disponible, reconstruir sin caché.
4. Esperar a que el contenedor nuevo esté saludable.

## Verificación

Probar primero en una ventana de incógnito:

- `https://teanimas.com/robots.txt`
- `https://teanimas.com/sitemap.xml`

La respuesta correcta debe cumplir:

| Ruta | Estado | `Content-Type` esperado | Contenido |
| --- | ---: | --- | --- |
| `/robots.txt` | `200` | `text/plain` | Empieza con `User-agent:` |
| `/sitemap.xml` | `200` | `application/xml` o `text/xml` | Empieza con `<?xml` |

Ninguna respuesta debe contener `<!doctype html>` ni el elemento `<div id="root">`.

Desde PowerShell se puede comprobar con:

```powershell
$robots = Invoke-WebRequest -Uri "https://teanimas.com/robots.txt" -UseBasicParsing
$sitemap = Invoke-WebRequest -Uri "https://teanimas.com/sitemap.xml" -UseBasicParsing

$robots.StatusCode
$robots.Headers["Content-Type"]
$robots.Content

$sitemap.StatusCode
$sitemap.Headers["Content-Type"]
$sitemap.Content
```

Después de verificar ambas URLs, enviar `https://teanimas.com/sitemap.xml` en Google Search Console.
