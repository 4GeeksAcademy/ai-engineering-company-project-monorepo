# Testing

## Pruebas automatizadas

El proyecto utiliza `pytest` para realizar pruebas automatizadas de la API.

La suite actual cubre los endpoints:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /users/me`
- `GET /users/`
- `GET /profiles/me`
- `PUT /profiles/me`

Actualmente se prueban principalmente casos de validacion, errores y acceso no autorizado.

Tambien se incluyen pruebas de:

- Comprobacion de salud de la API
- Validacion del analisis de incidentes
- Validacion de autenticacion
- Proteccion de endpoints mediante token
- Registro de usuarios
- Gestion de usuarios y perfiles

## Ejecutar las pruebas

Desde la raiz del proyecto:

```powershell
uv run pytest -v