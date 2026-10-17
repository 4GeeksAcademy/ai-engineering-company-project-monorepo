# Guía de testing para Ines: qué se hizo, paso a paso y por qué

Este documento es para **aprender**, no para entregar. Cuenta en orden todo lo que se hizo en el proyecto, explica cada decisión y enseña a leer un test. Las cifras y el código son reales: salen de ejecutar el proyecto el 2026-10-06.

> Hay dos documentos más, con otro fin. [`TESTING.md`](TESTING.md) es la guía breve para ejecutar los tests (lo pide el ticket AUTH‑088). [`docs/testing-plan.md`](docs/testing-plan.md) es el plan completo con una tabla por cada test. Este es el que explica el «porqué».

## Índice

1. [Vocabulario mínimo](#1-vocabulario-mínimo)
2. [El punto de partida: qué se pidió](#2-el-punto-de-partida-qué-se-pidió)
3. [Paso a paso: lo que se hizo, en orden](#3-paso-a-paso-lo-que-se-hizo-en-orden)
4. [Los tres niveles con ejemplos reales](#4-los-tres-niveles-con-ejemplos-reales)
5. [Trucos del proyecto que conviene entender](#5-trucos-del-proyecto-que-conviene-entender)
6. [Los 4 bugs que encontraron los tests (formato «revisa mi código»)](#6-los-4-bugs-que-encontraron-los-tests)
7. [¿Cómo sé si un test es bueno? La prueba de mutaciones](#7-cómo-sé-si-un-test-es-bueno-la-prueba-de-mutaciones)
8. [Errores míos (de la IA) y qué enseñan](#8-errores-míos-de-la-ia-y-qué-enseñan)
9. [Lo que queda pendiente de decidir](#9-lo-que-queda-pendiente-de-decidir)
10. [Cifras finales y cómo ejecutarlo todo](#10-cifras-finales-y-cómo-ejecutarlo-todo)
11. [Cómo trabajaremos cuando me envíes código](#11-cómo-trabajaremos-cuando-me-envíes-código)
12. [Mapa de ficheros](#12-mapa-de-ficheros)
13. [Ejercicios para practicar](#13-ejercicios-para-practicar)

---

## 1. Vocabulario mínimo

| Término | Qué significa | Ejemplo en este proyecto |
|---|---|---|
| **Test** | Código que ejecuta otro código y comprueba que el resultado es el esperado | Un token caducado debe ser rechazado |
| **Camino feliz** (*happy path*) | Todo sale bien: entradas normales, resultado normal | Un usuario correcto inicia sesión |
| **Caso límite** (*edge case*) | Valores en el borde de lo permitido | Una contraseña de 72 bytes sí; de 73, no |
| **Modo de fallo** (*failure mode*) | Algo sale mal y el sistema debe reaccionar bien | Un token manipulado nunca da acceso |
| **AAA** (Arrange / Act / Assert) | Estructura de un test: preparar, actuar, comprobar | Ver los ejemplos de §4 |
| **Fixture** | Preparación reutilizable que pytest da a los tests | `users_db`: una base de usuarios nueva para cada test |
| **Mock / monkeypatch** | Sustituir temporalmente una pieza real (el reloj, una variable de entorno) | `monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1")` |
| **Cobertura** | Porcentaje de líneas (y ramas) que ejecutan los tests | 98,33 % en autenticación |
| **Prueba de mutaciones** | Romper el código a propósito para ver si algún test lo nota | §7 |
| **`xfail` / `it.failing`** | «Este test falla a propósito: la debilidad existe y espera una decisión» | §9 |
| **Serialización HTTP** | La *forma* de la respuesta (claves del JSON, cabeceras). **No** se prueba: el ticket lo prohíbe | §5.3 |

**Idea central.** Un test no existe para subir un porcentaje: existe para **que falle cuando alguien rompa una regla de negocio**. Por eso se mide la calidad rompiendo el código (§7), no solo contando líneas.

---

## 2. El punto de partida: qué se pidió

**Contexto.** La API de autenticación está en producción con usuarios reales. Un refactor rompió la **caducidad del token** y nadie lo notó, porque no había tests. El CTO dijo: «El código sin tests no es código de producción».

Se pidieron tres tickets y unos criterios generales:

| Ticket | Qué pide | Cómo se cumplió | Dónde verlo |
|---|---|---|---|
| **AUTH‑088** (prioridad alta) | Tests de **todos** los endpoints de autenticación, cada uno con camino feliz, límite y fallo; pytest + Jest; que pasen limpiamente; **sin** probar serialización HTTP; un TESTING.md breve | 8 endpoints, 11 ficheros de test con tres secciones; un test que falla si falta alguno | `services/api/tests/`, `TESTING.md` |
| **API‑042** (baja) | Al menos 2 grupos de endpoints del backoffice, con el 60 % de cobertura | Proveedores y análisis de incidencias: **87,3 %** | `test_suppliers_directory.py`, `test_incident_analysis.py` |
| **FE‑019** (baja) | Al menos 3 funciones auxiliares del frontend con test de camino feliz y de fallo, en `__tests__/` | Más de 8 helpers (fechas, dinero, etiquetas, filtros, un *hook*…) | `uis/backoffice/src/__tests__/` |
| **Criterios generales** | Cobertura ≥ 70 % en autenticación; tres niveles; nombres claros; documentación; flujo asistido por IA evidente; `uv run pytest`, `uv run pytest --cov` y `jest --coverage` pasan | Todo cumplido (§10) | — |

También se dijo: «Un 70 % bien razonado vale más que un 95 % mecánico». Por eso el criterio principal fue **elegir bien qué probar**, no llegar a un número.

---

## 3. Paso a paso: lo que se hizo, en orden

### Paso 1 — Leer el código antes de escribir ningún test
Se leyó cómo funciona la autenticación: `auth/security.py` (hash de contraseñas y JWT), `auth/service.py` (comprobar credenciales), `auth/dependencies.py` (quién es el usuario de esta petición), `users/` (alta y gestión de cuentas) y, en el frontend, `lib/api.ts`, `lib/token.ts`, `auth/AuthContext.tsx` y `auth/RequireAuth.tsx`.

> **Qué aprender:** nunca se escribe un test sin entender qué regla defiende. Si no sabes explicar la regla en una frase, aún no puedes probarla.

### Paso 2 — Decidir qué es «la API de autenticación»
Son **8 operaciones**: `POST /auth/login`, `GET /auth/me`, y bajo `/users`: alta (`POST`), lista (`GET`), directorio (`GET /directory`) y lectura, edición y borrado por id. Los endpoints de `/profiles` (nombre, teléfono) quedan fuera: son datos de perfil, no credenciales ni sesión.

> **Qué aprender:** acotar el alcance es parte del trabajo. Una decisión explícita («esto no entra, y por qué») vale más que una cobertura vaga.

### Paso 3 — Preparar la infraestructura
- **`pyproject.toml`**: se configuró `pytest-cov` para medir `auth`, `users`, `profiles` y `core`, con ramas, y para **fallar si baja del 70 %**. Se registró el marcador `ai_suggested`.
- **`conftest.py`**: fixtures compartidas. Lo más importante: `users_db` y `profiles_db` crean una base temporal **nueva para cada test** (con alice, bob y carol), de modo que ningún test toca los datos reales ni depende de otro.
- **Jest**: `jest.config.mjs` con umbrales de cobertura por módulo (90 %), y `jest.global-setup.mjs` para fijar la zona horaria (§5.4).

### Paso 4 — Escribir los tests por módulo, siempre con tres niveles
Cada fichero tiene tres secciones con el mismo orden: `HAPPY PATH`, `EDGE CASES`, `FAILURE MODES`. Y cada test sigue Arrange / Act / Assert. Ver ejemplos en §4.

| Fichero | Qué defiende |
|---|---|
| `test_login.py` | `POST /auth/login`: credenciales, emails con mayúsculas, cuentas desactivadas, que no se revele si una cuenta existe |
| `test_register.py` | `POST /users`: contraseña de 8 a 72 bytes, emails duplicados, que el alta no pueda fijar `role` |
| `test_token.py` | El token como unidad: duración, firma, algoritmo, `exp`, `SECRET_KEY` (**la regresión que motivó todo**) |
| `test_session.py` | Una sesión de extremo a extremo: token manipulado, caducado, de una cuenta borrada |
| `test_me.py` | `GET /auth/me`: devuelve la cuenta de la sesión y nunca el hash |
| `test_accounts.py` | Quién puede leer, editar y borrar cuentas (propietario o admin), último admin protegido |
| `test_password.py`, `test_cli.py` | Hash bcrypt y el comando `create-user` |
| `test_edge_cases.py` | Casos hostiles sugeridos por la IA (§3 paso 8) |
| `test_suppliers_directory.py`, `test_incident_analysis.py` | Tickets API‑042 |

### Paso 5 — Ejecutar y corregir los errores de los propios tests
Los primeros intentos fallaron por suposiciones erróneas de la IA, no del producto (ver §8). Es normal: **un test que falla no siempre es un bug del código; a veces el bug está en el test**.

### Paso 6 — Una garantía automática: que no se olvide ningún endpoint
`test_endpoint_coverage.py` pide a FastAPI la lista de endpoints (esquema OpenAPI) y **falla** si:
- aparece un endpoint de `/auth` o `/users` sin sus tres tests, o
- un test nombrado en la tabla ya no existe, o
- un nivel está vacío o los tres niveles son el mismo test.

Así el requisito «todos los endpoints» deja de depender de la memoria de nadie.

### Paso 7 — Jest para la lógica en TypeScript
Se probaron el cliente de autenticación (`api.ts`), el almacenamiento del token, la redirección tras iniciar sesión (`returnTo.ts`), el contexto de sesión, la guarda de rutas y los validadores de formularios. 18 ficheros, 424 tests.

### Paso 8 — Sondear con entradas hostiles (el flujo asistido por IA)
Aquí está el valor real de usar una IA: **probar lo que a una persona no se le ocurre**. Se lanzaron unas 60 entradas hostiles, 10 647 mutaciones de un token y 4 680 entradas contra `safeReturnTo`. Salieron:
- **4 bugs reales** (§6), corregidos.
- **12 casos límite** guardados como tests con el marcador `ai_suggested` (`uv run pytest -m ai_suggested`).
- Varias debilidades que dependen de una decisión de diseño (§9).

### Paso 9 — Corregir los 4 bugs (primero el test, luego la corrección)
Método: se escribe el test que **falla** (`xfail`), se corrige el código mínimo, y el test se vuelve normal. Después se comprobó reintroduciendo cada bug que algún test vuelve a fallar (§6, con las salidas reales).

### Paso 10 — Comprobar la calidad de los tests con mutaciones (§7)
No bastaba con que los tests pasaran: había que saber si **detectarían** una rotura.

### Paso 11 — API‑042: tests de proveedores y análisis de incidencias
Mismo diseño de tres niveles. Cobertura de esos módulos con sus dos ficheros solos: **87,3 %** (el mínimo era 60 %; antes de añadir estos tests esos módulos estaban en un 69 %).

### Paso 12 — FE‑019: sacar helpers de los componentes y probarlos
Algunas funciones estaban dentro de componentes de React, difíciles de probar. Se **extrajeron** a módulos puros:
- `lib/format.ts`: `daysUntil` (días hasta una fecha), `renewalState`, `formatMoney` (`1200,50 €`), `formatDateTime`
- `lib/labels.ts`: frases del historial de una incidencia y etiquetas de botones
- `lib/useDebounced.ts`: un *hook* que espera a que el usuario deje de escribir
- `lib/profileFields.ts`: funciones del formulario de perfil

> **Qué aprender:** si algo es difícil de probar, a menudo la solución es **separarlo**: una función pura (entra un valor, sale otro) se prueba en tres líneas.

### Paso 13 — Retirar tests antiguos redundantes (solo con evidencia)
Pediste: «hazlo si ves que le viene bien al proyecto sin afectar nada». Se retiró `test_auth.py` y casi todo `test_users.py` porque repetían lo que ya cubren los módulos nuevos. **Antes** se comprobó:
1. La cobertura era idéntica sin esos ficheros.
2. De 171 mutaciones generadas automáticamente en el código de autenticación, la suite reducida detecta 165 y **ninguna** se detectaba solo con los tests retirados. Las 6 restantes se analizaron una a una: 5 no cambian el comportamiento y 1 era un hueco real, que ahora tiene su test.

Los originales siguen en git: `git show d6cd318:services/api/tests/test_auth.py`.

### Paso 14 — Documentar
`TESTING.md` (breve), `docs/testing-plan.md` (completo) y este documento. Se comprobó automáticamente que **todos los tests nombrados en la documentación existen** y que ninguno de los míos queda sin documentar.

---

## 4. Los tres niveles con ejemplos reales

Cada ejemplo es código real del proyecto. Para cada uno: **qué prueba** y **por qué importa**.

### 4.1 Camino feliz — «el token funciona y dura lo que debe»
Fichero: `test_token.py`

```python
# (resumido: el test real prueba UUID y texto como identificador)
def test_a_token_identifies_the_account_it_was_issued_for():
    token = create_access_token(cuenta)
    assert decode_access_token(token) == cuenta     # al decodificarlo sale esa misma cuenta
```

- **Qué prueba:** que un token emitido para una cuenta identifica a esa cuenta.
- **Por qué importa:** es el contrato básico de la sesión. Si falla, todo lo demás da igual.

### 4.2 Caso límite — «caduca justo cuando debe» (la regresión original)
Fichero: `test_token.py`

```python
def test_a_token_is_valid_until_its_lifetime_has_passed_and_not_after(clock, monkeypatch):
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1")      # Arrange: sesión de 1 minuto
    account = uuid4()
    token = create_access_token(account)

    clock(55)                                                   # Act: adelantamos el reloj 55 s
    assert decode_access_token(token) == account                # Assert: aún vale
    clock(65)                                                   # 65 s
    assert decode_access_token(token) is None                   # ya no vale
```

- **Qué prueba:** que el token vale hasta el instante de caducidad y deja de valer justo después.
- **Por qué importa:** es exactamente lo que se rompió en producción. Un test de «el token caduca» que solo probara con un token de hace un año **no habría detectado** una caducidad desplazada unos minutos; por eso se prueba a 55 y 65 segundos, a ambos lados del borde.
- **Truco:** `clock` mueve el reloj **sin dormir**. El test tarda milisegundos, no un minuto.

### 4.3 Caso límite con parametrización — la contraseña de 72 bytes
Fichero: `test_register.py`

```python
@pytest.mark.parametrize(
    ("password", "accepted"),
    [("1234567", False), ("12345678", True),   # frontera inferior: 7 no, 8 sí
     ("x" * 72, True),  ("x" * 73, False),     # frontera superior: 72 sí, 73 no
     ("é" * 36, True),  ("é" * 37, False),     # «é» ocupa 2 bytes: 72 bytes sí, 74 no
     ("pass\x00word1", False)],                # un byte NUL: bcrypt no puede con él
)
async def test_the_password_must_be_8_to_72_bytes_without_nul_bytes(async_client, users_db, password, accepted):
    response = await register(async_client, password=password)
    assert (response.status_code == 201) is accepted
    assert len(users_db) == (4 if accepted else 3)   # no se creó cuenta si se rechazó
```

- **Qué prueba:** la regla de la contraseña **a ambos lados de cada frontera**.
- **Por qué importa:** bcrypt solo lee los primeros 72 **bytes** (no caracteres). Si el servidor truncara en silencio, dos contraseñas distintas darían acceso a la misma cuenta. Se rechaza en vez de truncar.
- **Qué aprender:** las fronteras son donde viven los bugs. Prueba **n−1, n y n+1**.

### 4.4 Modo de fallo — «no revelar qué cuentas existen»
Fichero: `test_login.py` (abreviado: el test real prueba también una contraseña de 100 caracteres y una con `\x00`)

```python
async def test_unknown_email_wrong_password_and_deactivated_account_look_exactly_alike(async_client, users_db):
    users_db.update({"is_active": False}, lambda doc: doc["email"] == CAROL)          # Arrange
    unknown = outcome(await login(async_client, "ghost@example.com"))                 # Act
    answers = [outcome(await login(async_client, ALICE, "wrong-password")),
               outcome(await login(async_client, CAROL)),                             # contraseña buena, cuenta apagada
               outcome(await login(async_client, CAROL, "wrong-password"))]
    assert unknown[0] == 401                                                          # Assert
    assert all(answer == unknown for answer in answers)                               # todas iguales
```

- **Qué prueba:** que los cuatro rechazos (no existe, contraseña mala, cuenta desactivada…) son **indistinguibles**.
- **Por qué importa:** si el error dijera «esa cuenta no existe» o «está desactivada», un atacante podría descubrir qué emails están registrados. Esto es lógica de seguridad, no formato HTTP.

### 4.5 Modo de fallo — duplicados en cualquier forma
Fichero: `test_register.py`

El mismo email escrito como `ALICE@example.com`, `  alice@example.com  `, `<alice@example.com>` o `Mallory <alice@example.com>` debe dar siempre **409** (ya registrado) y no crear ni una cuenta ni un perfil huérfano.

- **Por qué importa:** si una variante pasara, existirían dos cuentas «iguales» y alguien podría registrarse con el email de otra persona.

### 4.6 Frontend (Jest) — camino feliz, límite y fallo de una función
Fichero: `format.test.ts`, función `daysUntil` (días hasta una fecha)

```ts
describe("daysUntil", () => {
  describe("happy path", () => {
    it("counts the whole days from today to a future date", () => {
      today(2026, 10, 6);
      expect(daysUntil("2026-10-07")).toBe(1);
      expect(daysUntil("2026-12-05")).toBe(60);
    });
  });
  describe("edge cases", () => {   // cambio de hora de otoño: ese día dura 25 horas
    it("counts calendar days across the autumn clock change (a 25-hour day)", ...);
  });
  describe("failure modes", () => {
    it.each(["", "not-a-date", "2026-13-45", "06/10/2026"])(
      "gives NaN, not an exception or a made-up number, for %j", (value) => {
        expect(daysUntil(value)).toBeNaN();
      });
  });
});
```

- **Qué prueba:** días hasta una fecha; que el cambio de hora no desplaza un día; que una fecha ilegible da `NaN` y no una excepción ni un número inventado.
- **Por qué importa:** esta función decide si un proveedor muestra un aviso de renovación. Una fecha mala no debe tumbar la tabla entera ni mostrar un aviso falso.

### 4.7 Ejemplo de «prueba de que algo NO ocurre»
`test_the_password_never_reaches_the_users_file_in_plain_text` abre el **fichero en disco** y comprueba que la contraseña no está. No basta mirar el objeto en memoria: lo que importa es lo que queda escrito.

---

## 5. Trucos del proyecto que conviene entender

### 5.1 Aislamiento: cada test empieza de cero
`users_db` y `profiles_db` son fixtures con `autouse=True`: se aplican a **todos** los tests sin pedirlas. Cada test recibe tres usuarios nuevos en una carpeta temporal. Resultado: el orden de ejecución no importa y nunca se tocan los datos reales.

### 5.2 Tests asíncronos sin red
`async_client` conecta `httpx.AsyncClient` directamente con la aplicación FastAPI (sin red, sin servidor). El test llama a `POST /users` como si fuera un cliente real, pero todo ocurre en el mismo proceso.

### 5.3 Qué es «serialización HTTP» y por qué NO se prueba
**No se prueba** la forma exacta del JSON, las cabeceras (`Content-Type`), ni el formato del cuerpo. **Sí se prueba** la lógica: quién es el dueño de un token, cuánto dura, qué queda guardado, que dos rechazos sean indistinguibles, que un error no repita la contraseña.

| ❌ Serialización (no) | ✅ Lógica (sí) |
|---|---|
| `assert response.json() == {"id": ..., "email": ..., "role": ...}` | `assert decode_access_token(token) == uuid_de_alice` |
| `assert response.headers["content-type"] == "application/json"` | `assert hash_guardado.startswith("$2b$")` |

El código de estado solo se usa como «aceptado» o «rechazado».

### 5.4 Un detalle de Jest: la zona horaria
Para probar el cambio de hora hay que fijar la zona horaria. Asignar `process.env.TZ` **dentro de un test no funciona** en Jest. La solución: `jest.global-setup.mjs` lo fija una vez antes de todo, y hay un test que falla si esa fijación se pierde.

### 5.5 Seguir sin dormir: `clock` y `frozen_clock`
`clock(segundos)` adelanta el reloj que usa la librería JWT. `frozen_clock(instante)` lo congela en un instante exacto, para probar el borde (`exp` justo ahora). Así los tests de caducidad son instantáneos y exactos.

---

## 6. Los 4 bugs que encontraron los tests

Este apartado sigue el formato que pediste para cuando me envíes código: **qué error hay, dónde, por qué ocurre, corrección mínima, código corregido y confirmación**. Las salidas son reales: reintroduje cada bug en una **copia** del proyecto (nunca en el repositorio), ejecuté su test, y luego restauré la corrección.

### Bug 1 — Un byte `\x00` en la contraseña daba un error 500 (gravedad media)

| | |
|---|---|
| **Dónde** | `services/api/users/schemas.py`, función `_check_password_bytes` |
| **Qué ocurre** | `POST /users` con una contraseña que contiene el carácter NUL (`\x00`) hace que el servidor responda **500** en lugar de rechazar la petición |
| **Por qué** | La validación comprobaba la longitud en bytes, pero no el NUL. La petición llegaba a `hash_password`, y bcrypt lanza `ValueError` ante un NUL; nadie lo capturaba |
| **Test que lo detecta** | `test_register.py::test_the_password_must_be_8_to_72_bytes_without_nul_bytes[nul-byte]` y `test_a_nul_byte_in_a_new_password_is_refused_and_keeps_the_old_one` |

**Sin la corrección** (salida real del test):
```
E   passlib.exc.PasswordValueError: bcrypt does not allow NULL bytes in password
1 failed, 7 passed
```

**Corrección mínima** (2 líneas, en el validador de Pydantic, para que se rechace con 422 antes de llegar a bcrypt):
```python
def _check_password_bytes(value: str | None) -> str | None:
    if value is not None and len(value.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise ValueError(f"password must be at most {MAX_PASSWORD_BYTES} bytes long")
    # bcrypt raises on a NUL byte: refuse it here (422) instead of crashing in hash_password (500).
    if value is not None and "\x00" in value:                       # ← añadido
        raise ValueError("password must not contain NUL characters")  # ← añadido
    return value
```

**Con la corrección:** `12 passed` (los tests de NUL de registro y del comando `create-user`).

> **Qué aprender:** el login ya gestionaba este caso, pero el alta no. Las reglas de validación deben estar **en un solo sitio** que ambos caminos compartan.

### Bug 2 — Un token firmado con `exp` nulo rompía las rutas protegidas (gravedad baja)

| | |
|---|---|
| **Dónde** | `services/api/auth/security.py`, función `decode_access_token` |
| **Qué ocurre** | Un token **bien firmado** cuyo `exp` es `null` o una lista hace que la ruta responda 500 |
| **Por qué** | La librería JWT lanza `TypeError` (no `JWTError`) en ese caso, y el `except` solo capturaba `JWTError, KeyError, ValueError`. Hace falta la clave de firma para fabricar ese token, por eso es de gravedad baja |
| **Test que lo detecta** | `test_token.py::test_a_non_numeric_exp_is_a_rejected_token_not_a_crash` |

**Sin la corrección:**
```
E   TypeError: int() argument must be a string, a bytes-like object or a real number, not 'NoneType'
1 failed
```

**Corrección mínima** (añadir un tipo de excepción):
```python
    except (JWTError, KeyError, ValueError, TypeError):  # TypeError: python-jose on an ``exp`` of null or a list
        return None
```

**Con la corrección:** `2 passed`.

> **Qué aprender:** una función cuyo contrato es «devuelve `None` ante cualquier token inválido» debe cumplirlo **ante cualquier entrada**, no solo las previstas.

### Bug 3 — Posible *open redirect* tras iniciar sesión (gravedad media, no confirmado de extremo a extremo)

| | |
|---|---|
| **Dónde** | `uis/backoffice/src/lib/returnTo.ts`, función `safeReturnTo` |
| **Qué ocurre** | `safeReturnTo("/\t/evil.example")` devolvía la ruta tal cual. Los navegadores eliminan tabuladores y saltos de línea al interpretar una URL, así que `"/\t/evil.example"` se convierte en `//evil.example`, que es **otro sitio web** |
| **Por qué** | La función rechazaba `//` y `/\`, pero no los caracteres de control entre ellos |
| **Test que lo detecta** | `returnTo.test.ts`: `must not resolve to another origin` y `refuses control characters anywhere in the path` |

**Sin la corrección** (salida real):
```
Expected: "/"
Received: "/	/evil.example"
Tests: 14 failed, 38 passed, 52 total
```

**Corrección mínima:**
```ts
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  if (CONTROL_CHARACTERS.test(value)) return "/";     // ← añadido
  return value;
}
```

**Con la corrección:** `52 passed`.

> **Qué aprender:** un *open redirect* permite que un enlace de tu web lleve a otra web. Validar listas de «lo malo» (`//`) es frágil; el test añade además una **invariante**: «todo lo que se acepta resuelve siempre al mismo origen». Y se advierte honestamente que no se confirmó cómo reacciona el router de Next.

### Bug 4 — El login guardaba el texto «undefined» como token (gravedad baja)

| | |
|---|---|
| **Dónde** | `uis/backoffice/src/lib/api.ts`, función `login` |
| **Qué ocurre** | Si la API respondía 200 **sin** `access_token`, el cliente guardaba la cadena `"undefined"` como token y desde entonces enviaba `Authorization: Bearer undefined` |
| **Por qué** | Se leía `access_token` de la respuesta y se guardaba sin comprobar que era una cadena no vacía |
| **Test que lo detecta** | `api.test.ts`: `a 200 with %s is an error and stores no token` (sin token, vacío, `null`, numérico) |

**Sin la corrección** (salida real):
```
● login › failure modes › a 200 with no access_token is an error and stores no token ...
● ... with an empty access_token ... / a null access_token ... / a numeric access_token ...
Tests: 4 failed
```

**Corrección mínima:**
```ts
const { access_token } = await response.json();
if (typeof access_token !== "string" || !access_token) {
  // Storing `undefined` would save the text "undefined" and send it as the bearer token on every call.
  throw new ApiError("Unexpected response from the server", 502);   // ← añadido
}
setToken(access_token);
```

**Con la corrección:** `4 passed`. Otro test garantiza que una respuesta inválida **no pisa** una sesión existente.

> **Qué aprender:** nunca guardes un dato recibido sin comprobar su tipo. «Funciona cuando todo va bien» no es lo mismo que «falla bien cuando algo va mal».

---

## 7. ¿Cómo sé si un test es bueno? La prueba de mutaciones

**Problema:** un test que pasa no demuestra que sirva. Un test vacío también pasa.

**Idea:** romper el código **a propósito**, una pequeña alteración cada vez (cambiar `>` por `>=`, quitar una línea, cambiar `32` por `33`) y ver si algún test falla. Cada rotura es una **mutación**:
- Si algún test falla → la mutación está **detectada** (bien).
- Si todos siguen pasando → **sobrevive**: o falta un test, o la mutación no cambia nada observable (**equivalente**).

**Qué se hizo y qué se aprendió:**

| Ronda | Resultado | Lección |
|---|---|---|
| Backend con los tests originales | 32 de 36 detectadas | 3 huecos reales: `user_id` entero enorme, `SECRET_KEY` corto, `manager` en rutas de solo admin |
| Frontend, primera tanda | 40 de 43 | 2 huecos reales (parpadeo a «anónimo» al iniciar sesión de nuevo; vista protegida con token ilegible) |
| AUTH‑088 | 29 de 31, luego 31 de 31 | El orden del directorio y la regla del último usuario no estaban bien probados |
| Muestra neutral de 171 mutaciones | 165 detectadas, 6 supervivientes | De las 6: 5 equivalentes y 1 hueco real (`MIN_SECRET_KEY_LENGTH`) que ya tiene test |

**Un ejemplo de hueco real.** Los tests importaban la constante `MIN_SECRET_KEY_LENGTH` y comprobaban `MIN_SECRET_KEY_LENGTH - 1`. Si alguien cambiaba la constante de 32 a 33, **los tests se movían con ella** y seguían pasando. Se arregló con un test que usa los números literales:

```python
def test_the_secret_key_rule_is_32_characters_exactly(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "k" * 32)
    assert get_jwt_secret.__wrapped__() == "k" * 32      # 32 es suficiente
    monkeypatch.setenv("SECRET_KEY", "k" * 31)
    with pytest.raises(RuntimeError, match="32"):
        get_jwt_secret.__wrapped__()                      # 31 no
```

> **Qué aprender:** un test que **importa la regla que debería vigilar** no la vigila. Escribe los valores a mano.

**Límite honesto:** los scripts de mutaciones eran herramientas de un solo uso y no están en el repositorio. Fue una verificación puntual, no algo reproducible con un comando.

---

## 8. Errores míos (de la IA) y qué enseñan

Se documentan para que veas qué debe revisar una persona (más en el §9 de `docs/testing-plan.md`).

| Error | Qué ocurrió | Lección |
|---|---|---|
| Asumió que toda respuesta 401 trae el mismo mensaje | Sin cabecera `Bearer`, FastAPI dice «Not authenticated» y con token malo, «Could not validate credentials» | Comprueba lo que **hace** el sistema; no lo que crees que hace |
| Test del orden del directorio con `zoe`, `Ana`, `bruno` | Esos nombres se ordenan igual **con y sin** distinguir mayúsculas: el test no probaba lo que decía | Un test debe fallar si la regla se rompe. La prueba de mutaciones lo descubrió; se cambió a `zoe`, `ana`, `Bruno` |
| Test de caducidad con `exp` de 5 minutos adelantando 11 | El error estaba en el test, no en el producto | Cuando falla un test, mira primero el test |
| `process.env.TZ` dentro de Jest | No cambia la zona horaria real: los tests de cambio de hora pasaban sin demostrar nada | Desconfía de un test que pasa a la primera. Se vio al notar que las horas salían en UTC |
| El escenario de «último usuario» | Siempre quedaba un admin, así que otra regla saltaba antes | Aísla la regla que quieres probar |

**Regla práctica:** si un test pasa a la primera, **desconfía** y rómpelo tú para ver que falla.

---

## 9. Lo que queda pendiente de decidir

Estos casos están escritos como **el comportamiento deseado** y marcados `xfail(strict=True)` (pytest, 7) o `it.failing` (Jest, 13). No son fallos: «estricto» significa que el día que alguien corrija el código el test fallará y habrá que quitar la marca. **Ninguno cambia código de producción**; esperan una decisión tuya o del equipo.

| # | Debilidad | Decisión pendiente |
|---|---|---|
| 1 | La contraseña no se normaliza en Unicode: dada de alta en NFC, el login con la misma en NFD da 401 | ¿Normalizar (NIST SP 800‑63B)? |
| 2 | Emails «homógrafos» aceptados (`аlice@…` con «а» cirílica) y el directorio enseña a cualquier sesión la parte local del email | ¿Restringir alfabetos? ¿Qué debe exponer el directorio? |
| 3 | `ACCESS_TOKEN_EXPIRE_MINUTES` enorme (≥ 1e10) da 500 en cada login | Validar al arrancar |
| 4 | TinyDB con varios procesos: 8 procesos dando de alta el mismo email crearon duplicados | ¿Cuántos *workers* usa el despliegue? |
| 5 | `PATCH /suppliers/{id}/rate` reescribe la fecha de actualización | ¿Es lo deseado? |
| 6 | `formatDateTime` muestra «Invalid Date» con una fecha ilegible | Decidir qué mostrar |
| 7 | Validadores del frontend y del backend no coinciden del todo | Unificar reglas |

Otros riesgos conocidos (no se probaron porque no existe el código): no hay límite de intentos de login, y los tokens no se invalidan al cambiar la contraseña. Ver §11 del plan.

---

## 10. Cifras finales y cómo ejecutarlo todo

| Qué | Resultado |
|---|---|
| Backend (`uv run pytest --cov`) | **667 pasan, 7 `xfail`** (674 recogidos), ~67 s |
| Cobertura de autenticación (mínimo 70 %) | **98,33 %** |
| Frontend (`jest --coverage`) | **424 pasan** en 18 ficheros, umbral del 90 % por módulo cumplido |
| API‑042: cobertura de proveedores e incidencias, con solo sus dos ficheros | **87,3 %** (mínimo 60 %) |
| Tipado del frontend (`tsc --noEmit`) | Sin errores |
| Advertencias de pytest | 1, ajena: viene de tests preexistentes que usan `TestClient` |

> **Por qué hay más tests que «casos de negocio»:** con la parametrización, una función de test se expande en varios casos (la contraseña de 72 y 73 bytes son dos casos de **una** función). Las decisiones son las funciones, no los casos.

**Comandos:**

```bash
# Backend, desde services/api
uv run pytest                      # toda la suite (~1 min por bcrypt)
uv run pytest --cov                # además mide la cobertura y falla por debajo del 70 %
uv run pytest tests/test_token.py  # un fichero
uv run pytest -k "expir"           # por palabra clave
uv run pytest -m ai_suggested      # solo los casos sugeridos por la IA

# Frontend, desde la raíz una vez y luego en uis/backoffice
npm ci
cd uis/backoffice
npm test                           # toda la suite (~5 s, sin API ni red)
npx jest --coverage                # con cobertura
npx jest -t "daysUntil"            # por nombre
```

**Cómo leer la cobertura.** La columna `Miss` son líneas que ningún test ejecuta, y `Branch/BrPart` son ramas (`if`/`else`) no recorridas. Las 6 líneas sin cubrir del backend son configuración de despliegue, rutas de migración o código que solo se ejecuta al arrancar, todo documentado en el §4.2 del plan. Un 100 % no demostraría nada: **cubrir una línea no es lo mismo que comprobar que hace lo correcto**.

---

## 11. Cómo trabajaremos cuando me envíes código

Cuando me envíes un fragmento de código, haré siempre estos seis pasos, en este orden:

1. **Generaré los tests** de los tres niveles: camino feliz, caso límite y modo de fallo.
2. **Explicaré cada test en una o dos frases:** qué prueba y por qué importa (como en el §4).
3. **Revisaré tu código** y te diré si algún test fallaría: **qué error hay, dónde está y por qué ocurre**.
4. **Propondré la corrección mínima** y te mostraré el código corregido.
5. **Comprobaré que los tests pasan** tras la corrección. No lo afirmaré: lo **ejecutaré** (como en el §6, mostrando la salida real antes y después).
6. **Te explicaré lo que aprendas** de cada fallo, para que sepas hacerlo tú.

**Plantilla de mi respuesta:**

```
## Test 1 (camino feliz): <nombre>
Qué prueba: …   Por qué importa: …
## Test 2 (caso límite): …
## Test 3 (modo de fallo): …

## Revisión de tu código
Error: …   Dónde: archivo:línea   Por qué ocurre: …
Corrección mínima: <diff>
Código corregido: <bloque>

## Confirmación
Antes: 1 failed (<mensaje>)   Después: 3 passed
```

---

## 12. Mapa de ficheros

```
TESTING.md                      Guía breve para ejecutar (ticket AUTH-088)
docs/testing-plan.md            Plan completo: tabla de cada test, hallazgos, riesgos (§12: tests retirados)
test-ines.md                    Este documento

services/api/
  pyproject.toml                Configuración de pytest, marcador y cobertura (mínimo 70 %)
  tests/
    conftest.py                 Fixtures: users_db, profiles_db, async_client, clock, frozen_clock…
    test_login.py               POST /auth/login
    test_register.py            POST /users
    test_me.py                  GET /auth/me
    test_accounts.py            GET/PUT/DELETE de cuentas, lista y directorio
    test_token.py               El token: duración, firma, exp, SECRET_KEY
    test_session.py             Sesiones de extremo a extremo
    test_password.py, test_cli.py
    test_edge_cases.py          Casos hostiles de la IA (marcador ai_suggested)
    test_endpoint_coverage.py   Garantía: ningún endpoint sin sus tres tests
    test_suppliers_directory.py Ticket API-042
    test_incident_analysis.py   Ticket API-042
    test_users.py               Reducido: arranque y migración de datos antiguos

uis/backoffice/
  jest.config.mjs               Umbrales de cobertura por módulo
  jest.global-setup.mjs         Fija la zona horaria (Europe/Madrid)
  src/lib/format.ts, labels.ts, useDebounced.ts   Helpers extraídos (FE-019)
  src/__tests__/
    lib/                        api, token, returnTo, errors, format, labels, filtros, hook…
    auth/                       AuthContext, RequireAuth
    components/                 SupplierRow, HistoryTimeline, StatusActions
    views/                      RegisterPage, ProfilePage
```

---

## 13. Ejercicios para practicar

Para aprender de verdad, haz estos ejercicios en una **copia** o en una rama (no en `main`). Tras cada cambio, ejecuta el test indicado y **mira cómo falla**.

1. **Rompe la caducidad.** En `auth/security.py` cambia `minutes=get_access_token_expire_minutes()` por `minutes=get_access_token_expire_minutes() * 2`. Ejecuta `uv run pytest tests/test_token.py -k "lifetime or thirty"`. ¿Qué tests fallan y por qué ahí?
2. **Rompe una frontera.** En `users/schemas.py` cambia `MAX_PASSWORD_BYTES = 72` por `73`. Ejecuta `uv run pytest tests/test_register.py -k "72"`. ¿Qué caso lo detecta?
3. **Un test que no detecta nada.** Cambia en `core/config.py` `MIN_SECRET_KEY_LENGTH = 32` por `33` y ejecuta `uv run pytest tests/test_token.py -k "secret"`. ¿Qué test lo detecta? Quita el test de literales del §7 y repite. ¿Qué pasa? ¿Qué te dice eso?
4. **Reintroduce un bug.** Quita la línea `if (CONTROL_CHARACTERS.test(value)) return "/";` de `returnTo.ts` y ejecuta `npx jest src/__tests__/lib/returnTo.test.ts`. Cuenta cuántos tests fallan.
5. **Escribe tu propio test.** Elige una función de `format.ts` (por ejemplo `formatMoney`). Escribe un test de camino feliz, uno límite (importe 0) y uno de fallo (moneda mal escrita). Antes de ejecutarlo, **predice** si pasará.
6. **Desconfía.** Escribe un test que no compruebe nada (`assert True`). ¿Pasa? ¿Qué cobertura da? ¿Por qué un test así es peor que no tener test?

> **Recuerda:** el objetivo de un test no es pasar. Es **fallar el día que alguien rompa lo que importa**.
