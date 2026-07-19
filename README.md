# ¿Te animás? — Frontend 2.15.1 R21

Frontend con cuentas por invitación, login, recuperación de contraseña y perfil persistente.

## Flujo de alta

1. El usuario ingresa nombre, apellido y email.
2. Game Master solicita una invitación a Directus.
3. El usuario abre el enlace recibido.
4. Elige la contraseña y activa la cuenta.
5. Inicia sesión normalmente.

El frontend no llama a `/users/register` ni accede directamente a `pc_user_profiles`.

## Despliegue

1. Instalá `directus-auth-r19`.
2. Publicá Game Master 1.10.0 con `PLAYER_ROLE_ID`.
3. Publicá este frontend.
4. Reconstruí la imagen sin reutilizar una versión anterior.
5. Abrí `/build-info.json` y confirmá `frontend_release: 2.15.1-r21`.

## Validación

```sh
npm ci
npm test -- --run
npm run build
```

## Inventario y variedad R20

El frontend incluye el bundle completo de 1.030 cartas como respaldo, prioriza los recursos elegidos, distribuye su aparición durante la sesión, registra las cartas seleccionadas por la IA en el historial persistente y muestra la cobertura real antes de empezar.
