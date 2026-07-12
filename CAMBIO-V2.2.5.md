# PecadoClub v2.2.5 — sin confirmación adicional durante la partida

Se eliminó el modal que aparecía al revelar cartas o niveles marcados con
`requires_confirmation`.

La confirmación previa de niveles explícitos en la configuración inicial se mantiene.
También permanecen disponibles:

- el botón `ALTO`;
- la opción `Saltar`;
- las notas de seguridad de cada carta;
- los filtros de límites antes de iniciar la partida.

## Actualización mínima

Reemplazá en GitHub:

```text
src/screens/GameScreen.tsx
package.json
package-lock.json
Dockerfile
```

Luego hacé commit y ejecutá **Deploy / Rebuild** en EasyPanel.

No hace falta tocar Directus ni regenerar `pc_public_bundle`.
