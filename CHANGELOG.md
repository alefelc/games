# 2.15.0 — R20

- Corrige las relaciones carta-elemento y carta-juguete para el catálogo completo.
- Prioriza y garantiza una presencia proporcional del inventario seleccionado.
- Añade cobertura de cartas de penetración en los niveles intensos cuando el filtro las permite.
- Guarda también las cartas elegidas por Dirección adaptativa en el historial entre partidas.
- Envía a la API el inventario y las prácticas de cada candidata.
- Muestra cobertura real por recurso y resumen de cartas compatibles antes de empezar.
- Corrige booleanos remotos recibidos como texto.

# 2.14.3 — R19

- Reemplaza el registro público por activación mediante invitación nativa de Directus.
- El registro inicial solicita nombre, apellido y email; la contraseña se define desde el enlace recibido.
- Elimina la dependencia de políticas, permisos personalizados y configuración de registro público.
- Mantiene los perfiles detrás de Game Master 1.9.1.

# 2.14.2 — R18

- Elimina los permisos personalizados rechazados por Directus 12.1.1.
- El rol Jugadores queda sin acceso directo al panel ni a colecciones.
- Añade una API privada de perfiles en Game Master 1.9.0.
- El backend identifica al jugador mediante su access token y fija el propietario en el servidor.
- El navegador deja de llamar a `/items/pc_user_profiles`.
- Permite editar nombre y apellido desde el perfil.

# 2.14.1 — R17

- Retira la migración R16 por modificar tablas internas de Directus.
- Nuevo instalador idempotente mediante APIs oficiales de colecciones, campos, roles, políticas, accesos, permisos y ajustes.
- Preflight obligatorio de `Admin Access` antes de cualquier escritura.
- Rollback automático de los cambios realizados por una ejecución fallida.
- El frontend ya no envía el campo `user` al crear perfiles; Directus lo fija con `$CURRENT_USER`.
- Validación adicional contra colisiones de nombres y permisos duplicados.
- R16 queda retirada y no debe desplegarse.

# 2.14.0 — R16

- Registro de usuarios con nombre, apellido, email y contraseña.
- Validación obligatoria del email antes del primer ingreso.
- Login, logout, recuperación y cambio de contraseña.
- Refresh token en cookie `httpOnly`; access token únicamente en memoria.
- Perfil privado por usuario en `pc_user_profiles`.
- Configuración predeterminada sincronizada por slugs estables entre dispositivos.
- Rol `Jugadores` sin acceso al panel y política limitada a `$CURRENT_USER`.
- El juego continúa disponible como invitado.
- No se sincronizan cartas, reacciones, respuestas ni historial de partidas.

# 2.13.10 — R15

- El ID de GA4 se configura exclusivamente desde `pc_app_settings.analytics_measurement_id`.
- Se elimina el ID integrado en el bundle y cualquier fallback runtime.
- Analytics no carga si el interruptor está apagado o el campo no contiene un ID `G-...` válido.
- Se incluye una migración de Directus para crear el campo visible junto a `Analytics Enabled`.

# 2.13.9 — R14

- GA4 `G-8CMSB2VYC8` queda integrado en el bundle del frontend.
- `Analytics Enabled` es el único interruptor necesario.
- Se elimina la dependencia de scripts PowerShell, permisos de esquema, slug y `runtime-config.js`.
- `runtime-config.js` se conserva únicamente como diagnóstico estático.

# Changelog

## 2.13.8 — Analytics R13

- El actualizador deja de depender del slug `te-animas`.
- La configuración runtime se genera antes de consultar Directus.
- Si existe una sola fila de `pc_app_settings`, se utiliza directamente.
- Los problemas de permisos o selección se convierten en advertencias y no cancelan GA4.

## 2.13.7 — Analytics R12

- El ID runtime de GA4 tiene prioridad sobre valores remotos anteriores.
- `runtime-config.js` queda preparado con `G-8CMSB2VYC8`.
- El actualizador ya no consulta endpoints `/fields`.

## 2.13.6 — Analytics sin permisos de esquema

- GA4 puede tomar el ID desde `GA4_MEASUREMENT_ID` en el contenedor.
- También admite `public/runtime-config.js` y conserva el campo remoto como alternativa.
- `Analytics Enabled` sigue siendo el interruptor maestro.
- Ya no es obligatorio dar permisos para modificar el modelo de datos.

# Historial anterior — Frontend 2.13.5 r10

## Analytics GA4 funcional

- `Analytics Enabled` ahora activa y desactiva realmente Google Analytics 4.
- Se agregó `Analytics Measurement Id` para guardar el identificador `G-XXXXXXXXXX`.
- GA4 se carga de forma dinámica únicamente cuando ambas configuraciones son válidas.
- Se registran aperturas, pantallas y acciones generales de partida.
- No se envían nombres, textos de cartas, límites, elementos, juguetes ni respuestas íntimas.
- El frontend sigue funcionando aunque el campo todavía no haya sido creado.

## Corrección incluida de r9

- El bloque **Ritmo de la partida** no repite el texto de la carta.
