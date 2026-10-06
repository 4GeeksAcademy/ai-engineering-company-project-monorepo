# Pruebas

Cómo ejecutar la batería de pruebas de la API de autenticación (ticket AUTH‑088) y del resto del backoffice. El plan completo (casos por endpoint, justificación, hallazgos) está en [`docs/testing-plan.md`](docs/testing-plan.md).

## Ejecutar

### Backend (pytest) — desde `services/api`

```bash
uv run pytest                      # toda la suite (674 tests, ~1 min por bcrypt)
uv run pytest --cov                # además mide la cobertura de autenticación y falla por debajo del 70 %
uv run pytest tests/test_login.py  # un fichero
uv run pytest -k "expir"           # por palabra clave
uv run pytest -m ai_suggested      # solo los casos límite sugeridos por la IA
```

### Frontend (Jest) — de forma independiente

No necesita la API, ni navegador, ni red (salvo para instalar). Basta con Node.

```bash
npm ci                                     # una vez, desde la RAÍZ del repositorio (monorepo con workspaces)
cd uis/backoffice
npm test                                   # toda la suite (424 tests, ~5 s)
npx jest --coverage                        # con cobertura; falla si un módulo baja del 90 %
npx jest src/__tests__/lib/format.test.ts  # un fichero
npx jest -t "daysUntil"                    # por nombre
```

Desde la raíz: `npm run test:backoffice`. Comprobado en una copia limpia, sin API y con otra zona horaria.

## Qué cubre

La **API de autenticación** son 8 operaciones: `POST /auth/login`, `GET /auth/me` y las de `/users` (alta, lista, directorio, y lectura, edición y borrado por id). Cada una tiene un test de **camino feliz**, uno de **caso límite** y uno de **modo de fallo**:

| Endpoint | Fichero |
|---|---|
| `POST /auth/login` | `test_login.py` |
| `GET /auth/me` | `test_me.py` |
| `POST /users` | `test_register.py` |
| `GET /users`, `GET /users/directory`, `GET`/`PUT`/`DELETE /users/{id}` | `test_accounts.py` |

Además: `test_token.py` y `test_session.py` (expiración, firma y revocación de tokens: la regresión que motivó el ticket), `test_password.py`, `test_cli.py` y, en el frontend, el cliente de autenticación, el contexto de sesión y la guarda de rutas.

**La garantía es automática.** `test_endpoint_coverage.py` recorre el esquema OpenAPI y **falla** si un endpoint de `/auth` o `/users` no tiene sus tres tests, o si un test nombrado desapareció. Al añadir un endpoint, escribe sus tres tests (copia el diseño de `test_login.py`) y anótalos en la tabla de ese fichero.

## Cobertura

| Qué | Resultado | Mínimo |
|---|---|---|
| Backend, autenticación (`uv run pytest --cov`) | **98 %** | 70 % |
| Frontend, módulos de autenticación y helpers (`jest --coverage`) | **100 %** | 90 % por módulo |
| Backoffice (proveedores y análisis CSV), con sus dos ficheros solos | **87 %** (antes 69 %) | 60 % |

Los dos primeros umbrales hacen **fallar** el comando si la cobertura baja: están en `services/api/pyproject.toml` y `uis/backoffice/jest.config.mjs`. Para el backoffice:

```bash
uv run pytest tests/test_suppliers_directory.py tests/test_incident_analysis.py \
  --cov=suppliers --cov=incidents.router --cov=incidents.service --cov=incidents.schemas --cov=incidents_analyzer \
  --cov-branch --cov-fail-under=60
```

## Criterio: qué se prueba y qué no

La cobertura es un **resultado**, no el objetivo: los umbrales (70 % y 90 %) son un suelo contra regresiones, y lo que decide si un caso entra es el riesgo («¿qué rompería en producción?»), empezando por lo que falló: la caducidad del token.

- **Cada test defiende una regla de negocio**, y su nombre se lee como esa regla. Se comprobó que falla cuando la regla se rompe (prueba de mutaciones); cuando un test no detectaba la rotura, se arregló el test en vez de perseguir la línea.
- **Los números engañan hacia arriba.** Las ~210 funciones de test del backend de este trabajo se expanden a ~470 casos por parametrización sobre valores frontera (contraseña de 72 y 73 bytes, `exp` justo en el límite, 0 y 60 días de aviso). Son una decisión por frontera, no relleno; las decisiones son las funciones, no los casos.
- **Se retiraron tests preexistentes redundantes** (`test_auth.py` y casi todo `test_users.py`) solo después de comprobar que la cobertura es idéntica y que 171 mutaciones neutrales no detectadas por la suite nueva eran 0 (plan, sección 12). Siguen en el historial de git.
- **Se deja fuera a propósito:** las librerías (bcrypt, JWT), el formato HTTP, los endpoints de `/profiles` (datos de perfil, no sesión) y lo que depende de una decisión de diseño aún abierta, que queda escrito como `xfail` en lugar de fijar un comportamiento dudoso.

## Reglas de las pruebas

- **Tres niveles** en cada módulo: `HAPPY PATH`, `EDGE CASES`, `FAILURE MODES`; cada test es Arrange / Act / Assert.
- **Se prueba la lógica, no la serialización HTTP.** Se comprueba quién es dueño de un token, cuánto dura, qué queda guardado o no, y que dos rechazos sean indistinguibles; no la forma del JSON, las cabeceras ni el formato del cuerpo. El código de estado solo cuenta como «aceptado» o «rechazado».
- **Aislamiento.** Cada test usa almacenes temporales (`users_db`, `profiles_db`, `suppliers_db`); nunca toca los reales. El reloj se adelanta con los fixtures `clock` y `frozen_clock`, sin dormir.
- **`xfail` e `it.failing`** (7 y 13) no son fallos: son debilidades encontradas por la IA que esperan una decisión de diseño y fallarán el día que se corrijan. Detalle en el plan, sección 8.

## Flujo asistido por IA

Las pruebas se desarrollaron con un asistente de IA (Claude Code). Cada módulo se comprobó rompiendo el código a propósito (prueba de mutaciones): se detectan todas salvo unas pocas mutaciones equivalentes, sin efecto observable. La IA también encontró y corrigió 4 bugs reales y propuso 12 casos límite, marcados `ai_suggested` / `AI-suggested`. Lo que se equivocó, y qué debe revisar una persona, está en el plan, sección 9.
