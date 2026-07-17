# Cambios 2.13.0

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
