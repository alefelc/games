# Cambios 2.13.2

- Normalización defensiva de `gm_scene_role` para partidas personalizadas.
- Compatibilidad con valores históricos, traducidos, vacíos y personalizados.
- Los roles desconocidos se infieren por nivel, intensidad y puntajes; ya no generan HTTP 422.
- Los eventos guardan roles canónicos para evitar que el historial vuelva a contaminar futuras solicitudes.

# Cambios 2.13.1

- Normalización defensiva de puntajes adaptativos 1–10 al contrato interno.
- Los errores 422 muestran los campos exactos rechazados por la API.

- Se corrigió la activación real de la dirección adaptativa.
- Se agregó comprobación de salud antes de iniciar.
- Se separaron IA activa, modo local elegido y recuperación temporal.
- Un fallo temporal ya no desactiva la IA para el resto de la partida.
- Se integró `pc_filters` y se eliminaron los límites fijos del frontend.
- Se agregaron los campos de visibilidad, selección y garantía de elementos y juguetes.
- Se incorporó historial entre partidas y preferencia por objetos seleccionados.
- Se renovó la caché PWA para impedir que siga ejecutándose el selector anterior.
- Se añadió un límite de error global y compatibilidad con bundles antiguos.
- El proxy de producción ya no reenvía el `Origin` del navegador al servicio interno, evitando falsos 403 por cambios de dominio.
