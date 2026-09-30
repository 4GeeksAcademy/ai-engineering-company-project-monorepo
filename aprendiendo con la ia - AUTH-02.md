# 📘 Aprendiendo con la IA — AUTH‑02: login, registro y rutas protegidas

> **Estudiante:** INES
> **Proyecto:** Nexova — backoffice (`uis/backoffice`, **Next.js**) y API (`services/api`)
> **Qué es este documento:** el diario de la tarea AUTH‑02. Aquí está todo lo que se hizo, **por qué** se hizo así, las **decisiones** que se tomaron y los **problemas** que aparecieron por el camino, con lo que se aprende de cada uno.
> Es la continuación de tu cuaderno general, [`aprendiendo con la ia.md`](./aprendiendo%20con%20la%20ia.md).

---

## 📑 Índice

1. [El encargo, en palabras sencillas](#1-el-encargo-en-palabras-sencillas)
2. [Conceptos que necesitas antes de empezar](#2-conceptos-que-necesitas-antes-de-empezar)
3. [Cómo se trabajó: el método](#3-cómo-se-trabajó-el-método)
4. [Lo que se construyó, pieza a pieza](#4-lo-que-se-construyó-pieza-a-pieza)
5. [Las decisiones importantes (y por qué)](#5-las-decisiones-importantes-y-por-qué)
6. [Problemas que aparecieron y cómo se resolvieron](#6-problemas-que-aparecieron-y-cómo-se-resolvieron)
7. [Seguridad: lo que hay que tener claro](#7-seguridad-lo-que-hay-que-tener-claro)
8. [Archivos que se tocaron](#8-archivos-que-se-tocaron)
9. [Cómo verlo funcionando](#9-cómo-verlo-funcionando)
10. [Glosario](#10-glosario)
11. [Ejercicios para practicar](#11-ejercicios-para-practicar)
12. [Segunda parte: migración a Next.js](#12-segunda-parte-migración-a-nextjs)

---

## 1. El encargo, en palabras sencillas

La **API** ya estaba protegida: si le pides datos sin identificarte, responde **401** ("no sé quién eres").
Faltaba el otro lado: que la **aplicación del navegador** (el backoffice) supiera:

| Requisito | Qué significa |
|---|---|
| `/login` | Entrar con email y contraseña |
| `/register` | Crear una cuenta y entrar directamente |
| `/account/profile` | Ver y editar tus datos |
| Protección de rutas | Si no has iniciado sesión, no puedes ver las páginas privadas |
| Ciclo del token | Guardarlo, enviarlo, borrarlo al salir y cuando caduca |
| Website público | Debe seguir abierto a todo el mundo |

---

## 2. Conceptos que necesitas antes de empezar

### 🎫 El token es como la pulsera de un festival

```
  Tú                       Backoffice (navegador)                 API
  │  email + contraseña  →  POST /auth/login  ─────────────────→  comprueba
  │                                            ←─────────────────  token (JWT)
  │                        guarda el token en localStorage
  │  "ver proveedores"  →  GET /api/suppliers
  │                        + Authorization: Bearer <token>  ───→  ¿token válido?
  │                                            ←─────────────────  200 datos  /  401 no
```

- **JWT**: un texto con tres partes separadas por puntos (`xxxxx.yyyyy.zzzzz`). Lleva dentro **quién eres** (`user_id`) y **cuándo caduca** (`exp`), firmado por la API para que nadie lo pueda falsificar.
- **localStorage**: una pequeña "caja" del navegador donde se guardan textos. Sobrevive a recargar la página.
- **`Authorization: Bearer <token>`**: la forma estándar de enseñar la pulsera en cada petición. "Bearer" significa "el portador", es decir, quien la lleve.
- **401 vs 403**: 401 = "no sé quién eres" (falta el token o no es válido). 403 = "sé quién eres, pero no tienes permiso".

### ⚛️ Piezas de React que aparecen

- **Context** (`AuthContext`): una "variable global" de React. Cualquier página puede preguntar "¿hay alguien con sesión?" con el hook `useAuth()`.
- **Layout guard** (`RequireAuth`): un componente que envuelve las páginas privadas y decide si se muestran o si te manda a `/login`.
- **Next.js (App Router)**: el framework que decide qué página se ve según la URL, a partir de las **carpetas** de `src/app/`. La primera versión de este trabajo usaba **React Router** (una librería que hace lo mismo con código); después se migró a Next.js, como pedía el enunciado ([sección 12](#12-segunda-parte-migración-a-nextjs)).

---

## 3. Cómo se trabajó: el método

Este orden vale para cualquier tarea de programación:

1. **Explorar antes de escribir código.** Lo primero fue leer el repo: qué apps hay, qué auth existía ya y qué contrato tiene la API (`POST /users`, `PUT /profiles/me`...). Así salieron dos sorpresas enseguida (ver [problemas 1 y 3](#6-problemas-que-aparecieron-y-cómo-se-resolvieron)).
2. **Preguntar cuando el enunciado no encaja con la realidad.** El enunciado decía Next.js y el repo no lo tiene. Eso no se decide a escondidas: se pregunta.
3. **Leer el "contrato" de la API** en su código (esquemas Pydantic, routers), en vez de suponerlo.
4. **Implementar en piezas pequeñas** y comprobar los tipos (`tsc`) después de cada una.
5. **Probarlo de verdad**: arrancar la API y la web y usar un navegador automático. Las pruebas encontraron **bugs reales** que a simple vista no se veían.
6. **Documentar** (README) y hacer commit.

---

## 4. Lo que se construyó, pieza a pieza

### 4.1 🔑 El token: guardar, leer y borrar — `src/lib/token.ts`

Un único archivo es el que toca `localStorage`. Ninguna página lo usa directamente.

```ts
const KEY = "nexova.token";
export function getToken()   { return localStorage.getItem(KEY); }   // leer
export function setToken(t)  { localStorage.setItem(KEY, t); ... }   // guardar (login/registro)
export function clearToken() { localStorage.removeItem(KEY); ... }   // borrar (logout/401)
```
*(Versión simplificada: el real envuelve cada acceso en `try/catch`, porque en modo privado el navegador puede bloquear `localStorage`.)*

Además avisa a quien esté escuchando cuando el token cambia (`onTokenChange`). Así la sesión de React se entera al momento.

**Novedad:** `onTokenChangeInOtherTab`. Escucha el evento `storage` del navegador, que salta cuando **otra pestaña** cambia `localStorage`. Así, si cierras sesión en una pestaña, las demás también salen.

### 4.2 📡 Enviar el token en cada llamada — `src/lib/api.ts`

Todas las llamadas protegidas pasan por **una sola función**, `apiFetch`:

```ts
async function apiFetch(path, init = {}) {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);        // 1. enseña la pulsera
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  // 2. si la API dice 401 → borra el token (solo si sigue siendo el mismo que se envió)
  if (response.status === 401 && token && getToken() === token) clearToken();
  return response;
}
```

💡 **Lección:** tener un único punto por el que pasan todas las peticiones significa que la regla "enviar token y reaccionar al 401" está escrita **una sola vez**. No hay forma de olvidarla en una página nueva.

Solo dos llamadas no usan `apiFetch`, porque son públicas: `POST /auth/login` y `POST /users` (el registro).

### 4.3 🧠 La sesión compartida — `src/auth/AuthContext.tsx`

Guarda el **estado de la sesión** (`loading` / `anonymous` / `authenticated`) y el usuario, y ofrece las acciones:

| Acción | Qué hace |
|---|---|
| `login(email, password)` | Pide el token, lo guarda y carga el usuario con `GET /auth/me` |
| `register(datos)` | Crea la cuenta (`POST /users`) y hace login automático |
| `saveProfile(cambios)` | `PUT /profiles/me` y actualiza el usuario en memoria |
| `refreshUser()` | Vuelve a pedir `GET /auth/me` |
| `logout()` | Borra el token y marca que fue un cierre de sesión voluntario |

Al **recargar la página**, si hay token guardado, **no se fía de él sin más**: primero lo comprueba con `GET /auth/me`. Si la API lo rechaza, lo borra.

### 4.4 🛡️ El portero — `src/auth/RequireAuth.tsx`

```
src/app/
├── layout.tsx               <AuthProvider> para toda la app
├── (public)/                ← grupo sin portero
│   ├── login/page.tsx       /login
│   └── register/page.tsx    /register
├── (app)/                   ← grupo con portero
│   ├── layout.tsx           <RequireAuth> + barra lateral
│   ├── page.tsx             /                 Inicio
│   ├── incidents/page.tsx   /incidents        Análisis de incidentes
│   ├── suppliers/page.tsx   /suppliers        Proveedores
│   └── account/profile/page.tsx  /account/profile  Mi perfil
└── not-found.tsx            cualquier URL desconocida → inicio (→ portero)
```

En Next.js **cada carpeta es un trozo de la URL** y `page.tsx` es la página. Los nombres entre paréntesis, como `(app)`, son **grupos**: no aparecen en la URL y sirven para que varias páginas compartan un `layout.tsx`. El portero está en el layout de `(app)`, así que protege automáticamente todo lo que metas en esa carpeta.

Qué hace el portero:
- **Sesión comprobándose** → muestra "Comprobando la sesión…".
- **Sin sesión** → `router.replace("/login?next=/la-pagina")`: te manda al login y apunta en la URL de dónde venías (con su `?query`), para devolverte ahí.
- **Con sesión** → muestra la página (`children`).
- **En cada navegación vuelve a leer el token.** Si alguien lo borró a mano (DevTools), cierra la sesión.

### 4.5 ✍️ Página de registro — `src/views/RegisterPage.tsx`

- Campos: email, contraseña, repetir contraseña, y un perfil opcional (nombre, teléfono, dirección).
- **Valida antes de enviar**, con los **mismos límites que la API**: contraseña de 8 a 72 bytes, nombre hasta 80, teléfono con patrón, dirección hasta 200.
- Los campos opcionales vacíos **no se envían**, y los textos se recortan (`trim`).
- Si la API responde **409** (email repetido) o **422** (dato inválido), el error aparece **debajo del campo afectado**, y lo escrito no se pierde.
- Si todo va bien: login automático → token guardado → te lleva a `/`.
- Si la cuenta se crea pero el login automático falla (por ejemplo, un fallo de red), dice "Cuenta creada, inicia sesión". **Nunca** dice "error al registrarte", porque la cuenta sí existe.

### 4.6 👤 Página de perfil — `src/views/ProfilePage.tsx`

- Al abrirse pide `GET /auth/me`: email (solo lectura) + nombre, teléfono y dirección.
- Al guardar envía `PUT /profiles/me` **solo con los campos que cambiaron**:

```ts
function diff(saved, form) {
  const update = {};
  if (form.name.trim()    !== saved.name)    update.name    = form.name.trim();
  if (form.phone.trim()   !== saved.phone)   update.phone   = form.phone.trim() || null; // vacío → null = borrar
  if (form.address.trim() !== saved.address) update.address = form.address.trim() || null;
  return update;
}
```

- ¿Por qué `null`? En esta API, **no enviar un campo** significa "déjalo como está", y **enviar `null`** significa "bórralo". Son dos cosas diferentes.
- El botón "Guardar cambios" está desactivado si no has cambiado nada, y "Descartar" devuelve los valores guardados.

### 4.7 🔀 Reenviar las llamadas a la API — `next.config.mjs`

El backoffice (puerto 5174) reenvía las llamadas a la API (puerto 8000). Así no hay problemas de CORS y en Codespaces solo necesitas abrir un puerto. En Next.js esto se hace con **rewrites**; en la primera versión, con Vite, se llamaba "proxy".

El problema: `/users` y `/profiles` son rutas de la API, pero el navegador también puede pedir esas URLs como páginas. La solución es reenviar **solo las llamadas de datos**:

```js
const notAPage = [{ type: "header", key: "accept", value: ".*text/html.*" }];
rewrites: [
  { source: "/api/:path*",      destination: `${API}/api/:path*` },
  { source: "/auth/:path*",     destination: `${API}/auth/:path*` },
  // "missing": solo si la petición NO pide HTML (es decir, no es el navegador cargando una página)
  { source: "/users",           destination: `${API}/users`,            missing: notAPage },
  { source: "/profiles/:path*", destination: `${API}/profiles/:path*`, missing: notAPage },
]
```

### 4.8 🐍 Cambio en la API — `services/api/users/router.py`

Antes, `POST /users` creaba la cuenta **inactiva**, pendiente de que un admin la aprobara. Ahora se crea **activa** y puedes entrar al momento. Se actualizaron también los tests de la API: los 155 pasan.

### 4.9 🧪 Pruebas automáticas (e2e) — `uis/backoffice/e2e/`

Son scripts con **Playwright**: abren un Chromium de verdad, rellenan formularios y hacen clic.

| Archivo | Qué comprueba |
|---|---|
| `register.e2e.mjs` | Validación, alta real, login automático, token, errores 409 y 422 |
| `profile.e2e.mjs` | Datos de `/auth/me`, guardado con Bearer, `null` para borrar, 401 al guardar |
| `guard.e2e.mjs` | Todas las rutas privadas sin token → `/login`, varias pestañas, website público |
| `token.e2e.mjs` | Token en cada llamada, logout, 401, carrera de tokens |
| `suppliers.e2e.mjs` | (el que ya existía) sigue pasando |

---

## 5. Las decisiones importantes (y por qué)

| Decisión | Alternativas | Por qué se eligió |
|---|---|---|
| **Primero en Vite + React Router; después, migrar a Next.js** | Crear otra app Next.js aparte; entregar solo código de referencia | El repo no tenía Next.js, así que primero se construyó y probó todo sobre lo que había. Cuando confirmaste que el enunciado exige Next.js, se **migró el backoffice existente**: una sola app, sin login duplicado, reaprovechando la lógica ya probada ([sección 12](#12-segunda-parte-migración-a-nextjs)). |
| **Token en `localStorage`** | Cookie `httpOnly` | Lo pedía el enunciado y la API ya funcionaba con Bearer. Tiene un coste de seguridad: ver [sección 7](#7-seguridad-lo-que-hay-que-tener-claro). |
| **Un único `apiFetch` para todo** | Poner la cabecera en cada llamada | La regla se escribe una vez y no se puede olvidar. |
| **Validar en el navegador *y* en la API** | Solo en la API | El navegador da respuesta rápida y en español; la API es la que manda de verdad (el navegador se puede saltar). |
| **Límites del perfil en un módulo compartido** (`profileFields.ts`) | Copiarlos en cada página | Registro y perfil validan igual; si cambia un límite, se cambia en un sitio. |
| **Errores debajo de cada campo** | Un único mensaje arriba | Se entiende mejor qué corregir, y es más accesible (`aria-invalid`, `aria-describedby`). |
| **Enviar solo lo que cambia en el perfil** | Enviar todo siempre | Evita pisar datos sin querer y deja claro qué se modificó. |
| **Tras un logout, el siguiente login empieza en `/`** | Volver a la última página | Si entra otra persona, no debe aparecer en la pantalla del usuario anterior. |
| **Tras un 401, volver a la misma página** | Ir siempre a `/` | Si te caduca la sesión, lo cómodo es seguir donde estabas. |
| **No tocar la API hasta que tú lo decidieras** | Cambiarla directamente | Aprobar o no las cuentas nuevas es una decisión de **negocio y seguridad**, no de programación. |
| **Probar con la API real** (copia en una carpeta temporal) | Solo simular respuestas | Las simulaciones no detectan que el proxy no reenvía `/users`; la API real sí. La copia evita ensuciar tu repo con datos de prueba. |

---

## 6. Problemas que aparecieron y cómo se resolvieron

Cada problema sigue el mismo esquema: **síntoma → causa → solución → lección**.

### 🔴 1. El enunciado pedía Next.js… y no había Next.js
- **Síntoma:** "implementa en las aplicaciones Next.js del monorepo".
- **Causa:** `uis/backoffice` y `uis/website` son Vite + React.
- **Solución:** parar y preguntar, con opciones claras.
- **Lección:** si el enunciado y el código no coinciden, **no inventes**: pregunta. Las ideas (guard, token, localStorage) son las mismas en cualquier framework.
- **Final:** más tarde se migró a Next.js. Como la lógica ya estaba separada del framework, casi no hubo que tocarla.

### 🔴 2. El mensaje venía cortado
- **Síntoma:** "siguiendo exactamente estos requisitos:" y solo aparecía el contexto.
- **Solución:** avisar y pedir el resto antes de programar.
- **Lección:** programar sin requisitos completos es programar dos veces.

### 🔴 3. El login automático tras el registro siempre fallaba
- **Síntoma:** registro OK, login automático → 401.
- **Causa:** la API creaba las cuentas **inactivas** (pendientes de aprobación).
- **Solución:** primero, la página lo trataba como "pendiente" en vez de como error. Después, **a petición tuya**, se cambió la API para crear las cuentas activas.
- **Lección:** el frontend depende del **contrato** de la API. Léelo en el código, no lo supongas.

### 🔴 4. El registro llamaba a la API… y le llegaba la web
- **Síntoma:** `POST /users` desde el navegador no llegaba a la API.
- **Causa:** el proxy de Vite solo reenviaba `/api` y `/auth`.
- **Solución:** reenviar `/users` y `/profiles`, pero solo las peticiones de datos, mirando la cabecera `Accept: text/html`. Hoy se hace con los rewrites de Next.js y `missing` ([4.7](#47--reenviar-las-llamadas-a-la-api--nextconfigmjs)).
- **Lección:** una misma URL puede ser una página o una llamada de datos. La cabecera `Accept` dice cuál es.

### 🔴 5. La API no arrancaba con `admin@nexova.test`
- **Síntoma:** `value is not a valid email address: ... special-use or reserved name`.
- **Causa:** `.test` es un dominio **reservado** y el validador de emails lo rechaza.
- **Solución:** usar `admin@example.com`.
- **Lección:** lee el error completo. Casi siempre dice exactamente qué pasa.

### 🔴 6. Chromium no arrancaba
- **Síntoma:** `error while loading shared libraries: libatk-1.0.so.0`.
- **Causa:** faltaban librerías del sistema en el Codespace.
- **Solución:** `npx playwright install chromium` + `npx playwright install-deps chromium`.

### 🔴 7. Un test encontró un fallo de accesibilidad 🦾
- **Síntoma:** el test no encontraba el campo "Contraseña" después de mostrar un error.
- **Causa:** el mensaje de error estaba **dentro** del `<label>`, así que el nombre del campo pasaba a ser "Contraseña La contraseña es obligatoria.". Un lector de pantalla lo leería así.
- **Solución:** sacar el error fuera del `<label>` y enlazarlo con `aria-describedby`.
- **Lección:** los tests que buscan elementos "como una persona" (por su etiqueta) **detectan problemas de accesibilidad**.

### 🔴 8. "Strict mode violation": dos enlaces "Proveedores"
- **Causa:** en el inicio hay un enlace en la barra lateral y otro en una tarjeta.
- **Solución:** buscar el enlace **dentro de** la navegación principal.
- **Lección:** en un test, sé específica sobre qué elemento quieres.

### 🔴 9. Tras cerrar sesión, el siguiente login volvía a la página anterior (bug de "carrera")
- **Síntoma:** logout desde `/suppliers` → login → acababas en `/suppliers`, no en `/`.
- **Causa:** dos redirecciones competían. El botón hacía `navigate("/login")`, pero el portero también redirigía y apuntaba "venías de /suppliers". Ganaba la última.
- **Solución:** que haya **una sola** fuente de verdad. `logout()` marca `loggedOut = true` y el portero, al verlo, redirige sin apuntar de dónde venías.
- **Lección:** cuando dos partes del código hacen lo mismo, acaban pisándose. Una responsabilidad, un sitio.

### 🔴 10. Un 401 "tardío" podía cerrar una sesión nueva
- **Escenario:** una petición sale con el token A y tarda. Mientras, se inicia sesión y se guarda el token B. La petición vieja vuelve con 401 y… borraba B.
- **Solución:** borrar solo si el token guardado **sigue siendo** el que se envió (`getToken() === token`).
- **Lección:** en programación asíncrona, el mundo puede cambiar mientras esperas una respuesta.

### 🔴 11. Cerrar sesión en una pestaña no afectaba a las otras
- **Solución:** escuchar el evento `storage` ([4.1](#41--el-token-guardar-leer-y-borrar--srclibtokents)).

### 🔴 12. Un test fallaba solo la segunda vez
- **Síntoma:** "Guardar cambios" seguía desactivado.
- **Causa:** una ejecución anterior se cortó y dejó guardado el mismo teléfono que el test quería poner, así que no había "cambios".
- **Solución:** el test elige un valor distinto al actual y restaura el perfil al terminar (`finally`).
- **Lección:** cada test debe **funcionar sin depender de lo que dejó el anterior**.

### 🔴 13. Problemas del entorno
- `pkill -f "vite ..."` **se mató a sí mismo**: el propio comando contenía el texto que buscaba. Se cambió por matar por número de proceso (PID).
- La carpeta temporal se vació a mitad de trabajo: hubo que recrear el entorno de Python.
- Al ejecutar `pytest` dentro del repo aparecieron `__pycache__` y `suppliers/db.json`. Se borraron para dejar el repo como estaba.
- **Lección:** deja el proyecto **como te lo encontraste**, sin restos de pruebas.

---

## 7. Seguridad: lo que hay que tener claro

1. **El portero del navegador NO es la seguridad real.** Cualquiera puede modificar el JavaScript de su navegador. La seguridad de verdad está en la **API**, que rechaza con 401 cualquier petición sin token válido. El portero solo sirve para que la experiencia sea buena.
2. **`localStorage` y XSS.** Si alguien consiguiera inyectar JavaScript en la página (un ataque XSS), podría leer el token. Una cookie `httpOnly` no se puede leer desde JavaScript, pero cambiaría cómo funciona la API. Aquí se usó `localStorage` porque lo pedía el enunciado; es importante saber el coste.
3. **Ahora cualquiera puede registrarse y entrar.** Con las cuentas activas al momento, un usuario nuevo (rol `user`) puede ver y modificar proveedores e incidentes, porque esas rutas no miran el rol. Lo que **sí** está protegido: nadie puede darse el rol `admin` al registrarse, y un admin puede desactivar cualquier cuenta. El siguiente paso lógico sería **permisos por rol** (ver ejercicios).
4. **El website público** sigue sin auth. Hay un test que lo comprueba: no envía tokens, no llama a `/auth` y no guarda nada en `localStorage`.

---

## 8. Archivos que se tocaron

| Archivo | Qué cambió |
|---|---|
| `uis/backoffice/src/lib/token.ts` | + aviso entre pestañas |
| `uis/backoffice/src/lib/api.ts` | + `register`, `updateMyProfile`, errores por campo, arreglo del 401 tardío |
| `uis/backoffice/src/lib/profileFields.ts` | 🆕 límites y validación del perfil (compartido) |
| `uis/backoffice/src/auth/AuthContext.tsx` | + `register`, `saveProfile`, `refreshUser`, `loggedOut`, sincronización entre pestañas |
| `uis/backoffice/src/auth/RequireAuth.tsx` | Layout guard: revisa el token en cada navegación, `?next=`, logout sin "volver a" |
| `uis/backoffice/src/lib/returnTo.ts` | 🆕 `?next=` seguro (sin *open redirect*) |
| `uis/backoffice/src/app/**` | 🆕 rutas de Next.js: layout raíz, grupos `(public)` y `(app)`, `not-found` |
| `uis/backoffice/src/views/RegisterPage.tsx` | 🆕 página de registro |
| `uis/backoffice/src/views/ProfilePage.tsx` | 🆕 página de perfil |
| `uis/backoffice/src/views/LoginPage.tsx` | Enlace a registro, vuelta a `?next=` |
| `uis/backoffice/src/components/Layout.tsx` | Entrada "Mi perfil"; `next/link` en vez de `NavLink` |
| `uis/backoffice/src/types/auth.ts` | Tipos del registro y del perfil |
| `uis/backoffice/next.config.mjs` | 🆕 rewrites hacia la API (sustituye a `vite.config.ts`) |
| `uis/backoffice/package.json`, `tsconfig.json` | Next.js 16 y TypeScript 5.9 en vez de Vite |
| `uis/backoffice/e2e/*.e2e.mjs` | 🆕 4 suites de pruebas (+ la de proveedores, adaptada) |
| `uis/backoffice/README.md` | Documentación de rutas y token |
| `services/api/users/router.py` (+ schemas, service, README, tests) | Cuentas nuevas activas |

---

## 9. Cómo verlo funcionando

**Terminal 1: la API**
```bash
cd services/api
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt uvicorn   # solo la primera vez
.venv/bin/uvicorn main:app --reload --port 8000
```

**Terminal 2: el backoffice**
```bash
npm run dev:backoffice        # desde la raíz del repo
```
Abre el puerto **5174** (pestaña *Ports* de VS Code). La primera vez que visitas cada página tarda un poco: en modo desarrollo, Next.js la compila al pedirla. Prueba: registrarte → entrar → "Mi perfil" → editar → "Cerrar sesión".
Para ver el token: DevTools → Application → Local Storage → `nexova.token`.

**Las pruebas automáticas** (con la API y el backoffice en marcha):
```bash
cd uis/backoffice
npx playwright install chromium        # solo la primera vez
E2E_EMAIL=tu@email.com E2E_PASSWORD=tucontraseña npm run e2e:register
# también: e2e:profile, e2e:guard, e2e:token, e2e
```

---

## 10. Glosario

| Término | Significado |
|---|---|
| **JWT** | Token firmado con quién eres y cuándo caduca |
| **Bearer** | "El portador": forma de enviar el token en la cabecera `Authorization` |
| **localStorage** | Almacén de textos del navegador que sobrevive a recargar |
| **401 / 403 / 409 / 422** | No identificado / sin permiso / conflicto (ya existe) / datos inválidos |
| **Guard** | Componente que decide si puedes ver una página |
| **Context / hook** | Estado compartido de React / función `useAlgo()` para usarlo |
| **Proxy** | Intermediario que reenvía peticiones de un servidor a otro |
| **SPA** | Aplicación de una sola página: el navegador cambia de "página" sin recargar |
| **e2e** | *End to end*: prueba que usa la app entera, como una persona |
| **Carrera (race condition)** | Error que depende del orden en que terminan cosas que ocurren a la vez |
| **XSS** | Ataque que inyecta JavaScript malicioso en una página |
| **Accesibilidad (a11y)** | Que la web se pueda usar con lector de pantalla, teclado, etc. |
| **App Router** | El sistema de rutas de Next.js: carpetas de `src/app/` = URLs |
| **Grupo de rutas** `(nombre)` | Carpeta que agrupa páginas (y su layout) sin aparecer en la URL |
| **Componente de servidor / de cliente** | El de servidor se genera en el servidor; el de cliente (`"use client"`) se ejecuta en el navegador y puede usar hooks y `localStorage` |
| **SSR** | *Server Side Rendering*: el servidor manda el HTML ya hecho |
| **Hydration** | Cuando React "da vida" en el navegador al HTML que vino del servidor. Si no coinciden, error |
| **Rewrite** | Regla de Next.js que reenvía una URL a otro destino sin que el navegador lo note |
| **Proxy (Next.js 16)** | El antiguo "middleware": código que se ejecuta en el servidor antes de cada petición |
| **Open redirect** | Fallo que permite usar tu web para redirigir a otra (útil para *phishing*) |

---

## 11. Ejercicios para practicar

1. **Caducidad en el navegador (fácil‑medio):** decodifica el token (la parte central es JSON en base64) y lee `exp`. Si ya ha caducado, bórralo sin esperar al 401. *Pista:* `JSON.parse(atob(token.split(".")[1]))`.
2. **Permisos por rol (medio):** crea un `RequireRole role="admin"` que funcione como `RequireAuth` pero compruebe `user.role`. Luego protege también la ruta en la API (`admin_only`). ¿Por qué hay que hacerlo en **los dos** sitios?
3. **Medidor de contraseña (fácil):** en `/register`, muestra "débil / media / fuerte" mientras se escribe.
4. **Tu propio test (medio):** añade a `profile.e2e.mjs` un caso que compruebe que un nombre de 81 caracteres se bloquea en el navegador.
5. **Pregunta para pensar:** ¿qué pasaría si `apiFetch` borrara el token con **cualquier** error, no solo con 401? Pista: piensa en qué pasa si la API se cae un momento.
6. **Next.js (medio):** añade una página `/account/security` dentro de `src/app/(app)/`. Comprueba que, sin tocar el portero, ya está protegida. ¿Por qué?
7. **Next.js (para pensar):** `src/views/HomePage.tsx` empieza con `"use client"` aunque no usa hooks. Quítalo, ejecuta `npm run build` y busca "Backoffice de Nexova" en `.next/server/app/index.html`. ¿Qué ves y por qué importa? (Solución en la sección 12, problema C.)

---

## 12. Segunda parte: migración a Next.js

### 🎯 Por qué

El enunciado pedía **"componentes y páginas Next.js"**. La primera versión se hizo sobre lo que tenía el repo (Vite + React Router). Cuando confirmaste que se exige Next.js, se **migró el backoffice** a **Next.js 16 con App Router**. Se volvieron a pasar todas las pruebas, en modo desarrollo **y** en producción.

### 🔄 Qué cambió y qué no

| Pieza | Antes (Vite + React Router) | Ahora (Next.js) |
|---|---|---|
| Rutas | `<Routes>` en `App.tsx` | Carpetas en `src/app/` |
| Páginas | `src/pages/*.tsx` | `src/views/*.tsx` + `src/app/**/page.tsx` que las importa |
| Portero | `<RequireAuth>` con `<Outlet />` | `<RequireAuth>` en `src/app/(app)/layout.tsx`, con `children` |
| Redirigir | `<Navigate to="/login">` | `router.replace("/login")` (`next/navigation`) |
| Enlaces | `<Link to>` / `<NavLink>` | `<Link href>` (`next/link`) + `usePathname()` para marcar el activo |
| Volver tras el login | estado interno del router (`state.from`) | en la URL: `/login?next=/suppliers` |
| Llamar a la API | proxy de `vite.config.ts` | rewrites de `next.config.mjs` |
| Variable de entorno | `VITE_API_BASE_URL` | `NEXT_PUBLIC_API_BASE_URL` |
| **Token, `apiFetch`, `AuthContext`, validaciones** | — | **Casi sin cambios** ✅ |

💡 **Lección principal:** como la lógica (token, API, sesión) estaba en archivos separados de la navegación, cambiar de framework solo obligó a tocar la "piel" de la app.

### 🧠 Conceptos nuevos de Next.js

**1. Servidor y cliente.** Next.js genera primero el HTML **en el servidor** y luego React lo "hidrata" en el navegador. En el servidor **no existe `localStorage`**. Por eso:
- Todas las vistas llevan `"use client"`, porque usan hooks y la sesión del navegador.
- La sesión empieza **siempre** en `"loading"` y el token se lee ya en el navegador (`useEffect`). Si el servidor dijera "anónimo" y el navegador "cargando", el HTML no coincidiría: un **error de hydration**.

**2. ¿Por qué no usar el "middleware" (ahora "proxy") de Next.js?** Se ejecuta **en el servidor**, antes de cada petición, y el servidor no puede leer el `localStorage` del navegador. Por eso el enunciado dice que no se use, y la protección se hace con un **layout guard en el cliente**. Dato curioso: en Next.js 16 el middleware se ha **renombrado a proxy**; lo encontramos leyendo la documentación que trae el propio paquete (`node_modules/next/dist/docs/`).

**3. `?next=` y el *open redirect*.** Ahora la página de vuelta viaja en la URL. Un atacante podría enviarte un enlace como `/login?next=https://web-falsa.com` para que, tras iniciar sesión, acabaras en su web. `src/lib/returnTo.ts` solo acepta rutas que empiecen por `/` (y no por `//`):

```ts
export function safeReturnTo(value) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
```

Hay un test que lo comprueba con `https://evil.example.com` y con `//evil.example.com`.

### 🔴 Problemas de la migración

**A. TypeScript 7 no sirve para Next.js**
- **Síntoma:** el repo usa TypeScript 7, y `require("typescript").createProgram` es `undefined`.
- **Causa:** TypeScript 7 es el compilador nuevo (nativo) y ya no incluye la API de JavaScript que Next.js usa para leer el `tsconfig` y comprobar los tipos.
- **Solución:** el backoffice tiene su propio TypeScript **5.9**; el resto del repo sigue con la 7. npm lo instala dentro de `uis/backoffice/node_modules`.
- **Lección:** antes de cambiar de herramienta, comprueba que es compatible con **lo que ya tienes**.

**B. `src/pages` no se puede usar**
- **Causa:** Next.js trata cualquier carpeta `pages/` como su sistema antiguo de rutas (*Pages Router*).
- **Solución:** renombrarla a `src/views` con `git mv`, para que git conserve el historial de cada archivo.

**C. El HTML del servidor enseñaba la página de inicio sin sesión**
- **Síntoma:** en el HTML de `/` generado en el servidor aparecía "Backoffice de Nexova", aunque el portero mostraba "Comprobando la sesión…".
- **Causa:** `HomePage` no usaba hooks, así que era un **componente de servidor**. Next.js lo renderizó en el servidor y lo envió dentro de la página, aunque el portero no lo mostrara.
- **Solución:** `"use client"` también en `HomePage`. Ahora las vistas protegidas no salen del servidor.
- **Lección:** en Next.js, **ocultar** no es lo mismo que **no enviar**. Mira siempre qué HTML genera el servidor.

**D. Dos "alertas" en cada página**
- **Síntoma:** los tests fallaban con "strict mode violation: 2 elements" al buscar `role="alert"`.
- **Causa:** Next.js añade un **anunciador de rutas** invisible (`#__next-route-announcer__`) con `role="alert"`. Sirve para que un lector de pantalla diga el nombre de la página nueva al navegar.
- **Solución:** los tests buscan las alertas de la app excluyendo ese elemento.

**E. Un 404 "nuevo"**
- **Síntoma:** error de consola "404" en el test del portero.
- **Causa:** con Vite, cualquier URL devolvía 200 (la misma app). Next.js responde **404** a una URL que no existe, que es lo correcto. Después, `not-found.tsx` te lleva al inicio.
- **Solución:** el test acepta ese 404 concreto como esperado.

**F. Un test que fallaba "a veces" (y dos lecciones)**
- **Síntoma:** el test del "401 tardío" fallaba 1 de cada 3 veces.
- **Causa 1:** esperaba 300 ms "a ojo". Con Next.js la navegación primero descarga la página, y a veces la petición salía después del cambio de token.
- **Causa 2 (la buena):** el JWT solo lleva `user_id` y `exp`, con precisión de segundos. Si dos logins ocurren en el **mismo segundo**, la API devuelve **exactamente el mismo token**. Entonces el "401 del token viejo" es un 401 del token actual, y borrarlo es lo correcto. Se confirmó midiendo: falló justo en las ejecuciones con tokens idénticos.
- **Solución:** esperar a que la petición llegue de verdad (no un tiempo fijo) y pedir un token nuevo hasta que sea distinto. Después, 8 de 8 ejecuciones en verde.
- **Lección:** un test que falla "a veces" casi nunca es mala suerte. **Mide antes de arreglar**, y no pongas esperas de tiempo fijo.

**G. `next start` sin build**
- **Causa:** al probar el typecheck "en limpio" se apartó la carpeta `.next`, y `next start` necesita una build.
- **Solución:** `npm run build` antes de `npm run start`.

**H. Aparecieron `AGENTS.md` y `CLAUDE.md`**
- **Causa:** `next dev` (Next.js 16) los genera solo, con notas para asistentes de IA. Se comprobó en el código de Next.js (`generate-agent-files.js`) antes de fiarse.
- **Solución:** incluirlos en el commit, porque `next dev` los volvería a crear.
- **Lección:** si aparece un archivo que no has creado tú, **averigua de dónde viene** antes de borrarlo o subirlo.

**I. En Codespaces la página se quedaba "congelada" (lo descubriste tú)**
- **Síntoma:** en tu navegador el proyecto no funcionaba, aunque todas las pruebas automáticas pasaban.
- **Causa:** en modo desarrollo, Next.js solo entrega su JavaScript a `localhost`. Tú entras por `…-5174.app.github.dev`, así que recibías el HTML pero el JavaScript respondía **403**: la página no cobraba vida. Las pruebas pasaban porque entraban por `localhost`.
- **Solución:** `allowedDevOrigins` en `next.config.mjs`, limitado a la dirección exacta de **tu** Codespace (se calcula con las variables `CODESPACE_NAME` y `GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN`). Cualquier otra dirección sigue bloqueada.
- **Lección:** prueba también **como lo usará la persona real**. Un test que pasa en un entorno distinto al suyo puede esconder un problema. Y si algo "no se ve", comprueba primero que **todos los servidores** (API y web) estén encendidos.

### ✅ Resultado

| Comprobación | Resultado |
|---|---|
| `npm run build` (7 rutas) | ✅ |
| `npm run typecheck` (`next typegen` + `tsc`) | ✅ |
| 5 suites e2e en **producción** (`next start`) | ✅ 104 comprobaciones |
| 5 suites e2e en **desarrollo** (`next dev`) | ✅ 104 comprobaciones |
| Website público sin autenticación | ✅ |

---

> 💬 **Consejo final:** lo más valioso de esta tarea no es el código, sino el método. Lee antes de escribir, pregunta cuando algo no encaja, prueba de verdad y deja el proyecto limpio. Los problemas 7, 9 y 10 de la sección 6 **solo aparecieron al probar**. Nadie los habría visto leyendo el código.
