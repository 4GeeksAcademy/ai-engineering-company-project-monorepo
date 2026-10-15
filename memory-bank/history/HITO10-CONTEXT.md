# CONTEXT — Directorio de Proveedores · TrackFlow

AUTH-01 — Implementar autenticación y protección de rutas
La API actualmente no tiene capa de autenticación. Esta tarea incluye:

Un módulo users con CRUD completo (crear, leer, actualizar, eliminar) solo para credenciales — email y contraseña.
Un módulo profiles con enlace uno a uno a cada usuario — el nombre visible y los datos de contacto viven en Profile, no en User.
Un endpoint de login que valide credenciales y devuelva un token JWT firmado.
Una dependencia reutilizable get_current_user que decodifique el token e identifique al usuario.
Aplicación de esa dependencia a todas las rutas que no deben ser de acceso público.
Almacena User y Profile solo en TinyDB — El JWT debe llevar el id del usuario en TinyDB; otros módulos lo referencian como user_uuid.

Usa OAuth2PasswordBearer de FastAPI y python-jose para la firma del token. Las contraseñas deben estar hasheadas — nunca almacenadas ni comparadas en texto plano. El token debe llevar como mínimo el ID del usuario y expirar tras una ventana configurable.

Todas las rutas relacionadas con autenticación deben vivir bajo /auth. Las rutas de gestión de usuarios bajo /users. Las rutas de perfil bajo /profiles.

Nota: Una vez que protejas tus rutas, puede que algunas llamadas del frontend dejen de funcionar temporalmente — es algo esperado. El frontend se actualizará para enviar el token en una fase posterior. Por ahora, el foco está en asegurar la API para evitar fuga de datos y accesos indebidos.