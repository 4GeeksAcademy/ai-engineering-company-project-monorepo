# README

## Conectando el Candado: Flujos de Autenticación en el Frontend

### 🎯 Tu reto
**📌 Estás construyendo sobre tu copia del monorepo de la empresa seleccionada al inicio del curso — no en un repositorio nuevo.**

En la entrega anterior aseguraste la API. Las rutas protegidas ahora devuelven `401` a cualquiera que no tenga una sesión válida — incluyendo tu propio frontend. Es momento de cerrar ese ciclo.

Tu tech lead ha abierto el siguiente ticket:

#### AUTH-02 — Flujos de autenticación y vistas protegidas en el frontend
La API ya exige un token JWT en las rutas protegidas. Esta tarea cubre el lado frontend de ese contrato:

- **Vistas de login y registro** — formularios que llaman a la API, reciben el token y lo almacenan correctamente.
- **Vistas de gestión de cuenta** — página de perfil.
- **Protección de rutas** — cualquier vista que requiera sesión debe redirigir a los usuarios no autenticados al login. Esto aplica a todas las aplicaciones del monorepo excepto el website público (Hito 1), que permanece completamente público.
- El token debe almacenarse en `localStorage` y adjuntarse a cada llamada protegida a la API mediante la cabecera `Authorization: Bearer <token>`. Al cerrar sesión, el token se elimina y el usuario es redirigido al login.

> **Importante:** No construyas una aplicación de autenticación separada. Integra estos flujos en las aplicaciones Next.js existentes dentro de tu monorepo.

---

### Conocimiento complementario: el lado frontend del JWT
Una vez que la API devuelve un token en el login, el trabajo del frontend es: almacenarlo, enviarlo y reaccionar a su ausencia. El patrón estándar en Next.js es:

1. **Almacenar el token** en `localStorage` después de una respuesta de login exitosa.
2. **Leer el token** en cada llamada protegida a la API y establecerlo en la cabecera `Authorization: Bearer <token>`.
3. **Proteger rutas** — usa un *layout guard* o *hook* en el cliente que lea `localStorage` y redirija a `/login` si no hay token. El middleware de Next.js corre en el servidor y no puede leer `localStorage`; no lo uses para esta comprobación salvo que también guardes una cookie que el middleware pueda ver.
4. **Limpiar el token** al cerrar sesión y redirigir al login.

> **Nota:** La rotura temporal del frontend de la entrega anterior termina aquí. Al finalizar este proyecto, todas las vistas protegidas deben funcionar de extremo a extremo con autenticación real.
Asegúrate de que tu API de la entrega anterior está corriendo y es accesible desde el frontend antes de empezar.


# 💻 Qué Debes Hacer

## Vistas de autenticación

- [ ] `/login` — formulario de email y contraseña. Si tiene éxito: almacena el token en `localStorage`, redirige a la vista autenticada principal. Si falla: muestra un mensaje de error claro.
- [ ] `/register` — formulario de registro. Si tiene éxito: llama a `POST /users` (incluye campos opcionales de perfil), luego a `POST /auth/login` con las mismas credenciales, almacena el token y redirige. Si falla: muestra errores de validación a nivel de campo.

## Vistas de gestión de cuenta

- [ ] `/account/profile` — muestra el email del usuario actual más los datos de perfil (`name`, `phone`, `address`) desde `GET /auth/me`. Permite editar nombre y contacto mediante `PUT /profiles/me` con el token en la cabecera.

## Protección de rutas

- [ ] Identifica todas las vistas de tus aplicaciones Next.js (excluyendo el website público) que requieren sesión autenticada.
- [ ] Implementa un mecanismo de protección en el cliente (layout guard o hook personalizado) que compruebe el token en `localStorage` y redirija a `/login` si está ausente o no es válido. No uses el middleware de Next.js para esto salvo que el token también esté en una cookie que el middleware pueda leer.
- [ ] Asegúrate de que el website público (Hito 1) no se ve afectado — sin comprobación de token, sin redirección.

## Ciclo de vida del token

- [ ] En login y registro: almacena el token en `localStorage`.
- [ ] En cada llamada protegida a la API: lee el token y adjúntalo como `Authorization: Bearer <token>`.
- [ ] Al cerrar sesión: elimina el token de `localStorage` y redirige a `/login`.
- [ ] Si una llamada protegida a la API devuelve `401`: limpia el token y redirige a `/login`.

---

# ✅ Qué Vamos a Evaluar

- [ ] Los formularios de login y registro funcionan de extremo a extremo: el token se almacena tras una llamada exitosa.
- [ ] Las vistas protegidas redirigen a `/login` cuando no hay un token válido en el almacenamiento.
- [ ] El website público (Hito 1) continúa funcionando sin ninguna comprobación de autenticación.
- [ ] La vista de perfil muestra el email de `User` y los datos de nombre/contacto del `Profile` vinculado, y actualiza el perfil mediante `PUT /profiles/me`.
- [ ] El logout elimina el token y redirige correctamente.
- [ ] Una respuesta `401` de cualquier llamada protegida a la API limpia la sesión y redirige a `/login`.

---

# 📦 Cómo Entregar

Sube tu rama y abre un pull request contra `main` en tu monorepo. La descripción del PR debe incluir: qué vistas están ahora protegidas y confirmación de que el website público no se vio afectado.