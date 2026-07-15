# ¿Te animás? frontend v2.5.0

Este paquete reemplaza el repositorio completo; no es otro parche parcial.

## Corrige

- Los selectores Hombre/Mujer aparecen debajo de cada nombre.
- Los campos muestran `Vos` y `Tu pareja` como placeholders reales.
- Los valores heredados `Vos`/`Tu pareja` se limpian automáticamente.
- Nuevo límite `Excluir sexo anal`.
- `Excluir estimulación manual` pasa a `Excluir masturbación`.
- Soporta 182 cartas y el campo `contains_anal`.
- Conserva el GameScreen personalizado:
  - nombre del turno dentro de la carta;
  - sin código técnico;
  - sin letras de póker;
  - logo en el reverso;
  - símbolo personalizado.
- Reduce el logo del reverso en mobile.
- Cambia los nombres de caché para no reutilizar la versión vieja.

## Publicación

Borrá los archivos del repositorio del frontend y subí el contenido completo de este ZIP.
El Dockerfile debe quedar en la raíz. Hacé commit y Deploy/Rebuild sin caché.
