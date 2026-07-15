# Corrección del giro v2.6.1

El problema se producía porque el reverso y el frente se ocultaban mediante dos
animaciones independientes. En algunos navegadores móviles ambas caras podían
terminar ocultas.

La carta ahora:

1. muestra una sola cara;
2. se afina hasta el centro;
3. cambia el contenido en el punto medio;
4. recupera su tamaño mostrando la pregunta o acción.

No puede superponerse el logo ni desaparecer el frente.
