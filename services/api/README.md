# TrackFlow API Service

Servicio backend para operaciones internas de TrackFlow.

## Estructura de entrega
```text
services/api/
	main.py              # aplicacion FastAPI y arranque
	models.py            # modelos Pydantic de entrada y respuesta
	database.py          # inicializacion y cierre de TinyDB
	security.py          # dependencia Bearer y firma JWT
	user_service.py      # servicios TinyDB de usuarios y perfiles
	routes/users.py      # CRUD de usuarios
	routes/profiles.py   # perfil del usuario autenticado
	routes/auth.py       # login JWT y datos del usuario actual
	routes/suppliers.py  # endpoints del directorio
	seed.py              # proveedores exactos del contexto
```

`src/server.js` conserva la API Node de incidencias y el proxy del directorio; `src/start.js` arranca ambos servicios. El directorio tambien funciona directamente como aplicacion FastAPI con `uv run uvicorn main:app --host 0.0.0.0 --port 8081`.

## Endpoints
- `POST /users` -> registra un usuario con rol `user` y crea su perfil TinyDB vinculado.
- `GET /users`, `GET /users/{id}`, `PUT /users/{id}`, `DELETE /users/{id}` -> CRUD protegido; solo el dueño o un admin puede consultar, modificar o eliminar por ID. Solo un admin puede cambiar roles.
- `POST /auth/login` -> acepta JSON con `email`/`password` y el formulario OAuth2 (`username`/`password`); devuelve un JWT Bearer.
- `GET /auth/me` -> email, rol y perfil vinculado del usuario autenticado.
- `GET /profiles/me`, `PUT /profiles/me` -> consulta y actualiza el perfil propio.
- `GET /health` -> devuelve estado del servicio.
- `POST /suppliers` -> crea un proveedor (201) con `id` de TinyDB y `updated_at` UTC generados por el sistema.
- `GET /suppliers` -> lista completa; filtros opcionales `country=USA|Spain` y `category=<categoria>`, combinables.
- `GET /suppliers/{id}` -> detalle, o 404.
- `PATCH /suppliers/{id}/rate` -> cuerpo `{"rate_per_shipment": 8.25}`; actualiza automaticamente `updated_at`.
- `PATCH /suppliers/{id}/status` -> cuerpo `{"status": "active"}` o `{"status": "suspended"}`.
- `DELETE /suppliers/{id}` -> elimina (204), o 404. En operaciones se recomienda suspender en lugar de eliminar.
- `POST /api/incidents/analyze` -> recibe `multipart/form-data` con un archivo `.csv` en el campo `file`; responde con totales, desglose por categoria, estado y pais, CSAT e incidencias de validacion.
- `GET /api/incidents/results/export` -> descarga como `results.csv` el ultimo analisis completado en esta instancia.

Los archivos se limitan a 10 MB. Los CSV con esquema invalido o no procesables devuelven un error descriptivo. El servidor reutiliza el procesador Python ubicado en `scripts/incidents_analysis.py`; requiere Python 3.10 o posterior y puede configurarse con `PYTHON`.

## Ejecutar en local
Requisitos: Node.js y Python >= 3.10 con [uv](https://docs.astral.sh/uv/getting-started/installation/).

```bash
cd services/api
uv sync
umask 077 && printf 'SECRET_KEY=%s\nACCESS_TOKEN_EXPIRE_MINUTES=30\n' "$(openssl rand -hex 32)" > .env
uv run seed
npm run dev
```

La clave JWT se carga exclusivamente desde `services/api/.env`; el archivo está excluido de Git. No reutilices la clave de desarrollo en producción. Para probar el flujo en `/docs`, registra en `POST /users`, inicia sesión en `POST /auth/login` y autoriza las rutas con el token Bearer devuelto. La caducidad se controla con `ACCESS_TOKEN_EXPIRE_MINUTES`.

`uv run seed` inserta los 15 proveedores exactos de `CONTEXT.md`, imprime el numero de inserciones y no duplica registros existentes con el mismo nombre y pais ni sobrescribe sus cambios. Ejecutarlo con el servicio detenido.

`npm run dev` inicia la API Node en `0.0.0.0:8080` y FastAPI en `0.0.0.0:8081`. Node conserva incidencias y redirige `/suppliers` a FastAPI. Para ejecutar solo el directorio: `uv run serve`. Documentacion interactiva: `http://localhost:8081/docs`.

La persistencia por defecto es `services/api/data/suppliers.json` (excluida de Git). `SUPPLIERS_DB_PATH` cambia la ubicacion tanto para API como para seeder; `SUPPLIERS_PORT` cambia el puerto Python y su proxy Node; `PORT` cambia el puerto Node. `CORS_ORIGINS` admite una lista separada por comas de origenes autorizados para acceso directo a FastAPI.

Pydantic rechaza entradas invalidas con 422 antes de persistir: tarifa no positiva o no finita, nombre vacio, categorias vacias/desconocidas, estados distintos de `active`/`suspended`, y combinaciones distintas de USA/USD o Spain/EUR. Campos opcionales: `service_zone`, `contact_email` (email valido), `notes`. El cliente no puede enviar `id` ni `updated_at`.

Users y Profiles se guardan exclusivamente en tablas TinyDB (`users` y `profiles`), nunca en SQL/Supabase. Todas las rutas de proveedores requieren JWT. Son públicos el registro `POST /users`, el login y la recuperación/restablecimiento de contraseña; el cambio de contraseña exige sesión.

TinyDB usa un bloqueo para lecturas/escrituras dentro del proceso. Ejecutar **una sola instancia/worker** y no ejecutar el seeder mientras la API esta activa; TinyDB no es adecuado para escrituras multiproceso. `updated_at` registra la ultima tarifa, no un historial completo de tarifas o suspensiones.

## AUTH-03: recuperacion y cambio de contrasena

- `POST /auth/forgot-password`: recibe `{"email":"persona@example.com"}`. Para cualquier email valido devuelve 200 y el mismo mensaje, exista o no la cuenta, incluso si falla el proveedor de correo. El envio se procesa despues de responder y los fallos dejan un mensaje operativo sin direcciones, tokens ni credenciales en los logs. Un cuerpo o email invalido devuelve 422.
- `POST /auth/reset-password`: recibe `{"token":"...","new_password":"..."}`. Valida firma, proposito, expiracion y hash persistido en TinyDB. Devuelve 200 o 400 si el token no es valido, esta caducado o ya se utilizo.
- `POST /auth/change-password`: recibe `{"current_password":"...","new_password":"..."}` y `Authorization: Bearer <sesion>`. Devuelve 200, 400 si la contrasena actual es incorrecta, o 401 sin sesion valida.

Las nuevas contrasenas requieren al menos 8 caracteres y un maximo de 72 bytes UTF-8 (limite de bcrypt); no se recortan. Las entradas invalidas devuelven 422.

### Configuracion de Resend

Define estas variables en el entorno del proceso o en `services/api/.env`, sin versionar valores reales:

| Variable | Valor / funcion |
| --- | --- |
| `RESEND_API_KEY` | API key privada de Resend con permiso de envio. Obligatoria para enviar correos. |
| `RESEND_FROM_EMAIL` | Remitente permitido por Resend, por ejemplo `TrackFlow <acceso@tu-dominio-verificado.com>`. Verifica tu dominio en Resend; las cuentas de prueba restringen los destinatarios. |
| `PASSWORD_RESET_URL` | URL absoluta del frontend, sin query ni fragmento. Por defecto `http://localhost:5174/reset-password`. En Codespaces usa la URL HTTPS publicada del puerto 5174 y en produccion la URL HTTPS definitiva. |
| `SECRET_KEY` | Clave de firma JWT existente, al menos 32 caracteres. |

No se carga automaticamente el `.env` de la raiz: la carga existente apunta al de `services/api`. Los archivos `.env` y `.env.*` estan ignorados en todo el repositorio. Nunca uses variables `VITE_` para una API key, porque el navegador podria leerla.

Se usa la API HTTPS oficial de Resend (`POST https://api.resend.com/emails`), con tiempo limite de 15 segundos, enviando texto plano y HTML adaptable a movil. El enlace dura **30 minutos**. Solo se guarda su SHA-256 en el registro del usuario; emitir otro reemplaza el anterior. La actualizacion bcrypt y el borrado del hash pendiente ocurren en una misma escritura bajo el bloqueo existente de TinyDB. Cualquier cambio de contrasena, incluido el CRUD de usuarios, invalida los enlaces pendientes. Un token de recuperacion no sirve como sesion ni viceversa.

Los JWT de sesion previamente emitidos conservan su caducidad original: este cambio no implementa revocacion de sesiones, rate limiting ni auditoria. Los trabajos de correo en segundo plano no son una cola persistente; revisa los logs si un proveedor falla y solicita un nuevo enlace tras corregirlo.

Para ejecutar solo esta API en Codespaces despues de configurar las variables:

```bash
cd services/api
uv sync
uv run uvicorn main:app --host 0.0.0.0 --port 8081
```

La comprobacion local de AUTH-03 usa una base temporal y un transporte simulado: no acredita entrega real de correos. Para la aceptacion final, registra una cuenta con un email permitido en Resend, solicita el enlace desde el frontend, abre el correo, cambia la contrasena e intenta reutilizar el mismo enlace (debe fallar).

## Pruebas
```bash
cd services/api
uv run pytest -q
```

Las pruebas cubren el registro/login JWT, bcrypt, perfiles, permisos 401/403, roles, expiración, CRUD de usuarios, protección de proveedores y persistencia TinyDB tras reiniciar Uvicorn.
