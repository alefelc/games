# ¿Te animás? v2.3.0 — configuración directa desde Directus

## Qué cambia

La web sigue leyendo cartas, mazos y relaciones desde `pc_public_bundle`, pero ahora
lee **en vivo** estas tres colecciones cada vez que abre o se pulsa actualizar:

- `pc_games`
- `pc_themes`
- `pc_app_settings`

Por eso los cambios de nombre, textos, colores, logo, fuentes y ajustes generales se
reflejan sin PowerShell, sin extensiones y sin regenerar snapshots.

## Única configuración en Directus

En:

```text
Settings → Access Policies → Public
```

habilitá **Read → All Access** solamente para:

```text
Pc Games
Pc Themes
Pc App Settings
```

No habilites públicamente cartas, mazos, juguetes ni tablas relacionales.

Estas tres colecciones no deben contener secretos. La app solicita únicamente una lista
cerrada de campos.

## Despliegue

Reemplazá todo el repositorio con el paquete completo o aplicá el parche mínimo.
Luego hacé commit y ejecutá Deploy/Rebuild en EasyPanel.

## Uso diario

Después de guardar cambios en esas tres colecciones:

```text
abrir o recargar census.ar
```

No hay ningún comando adicional.
