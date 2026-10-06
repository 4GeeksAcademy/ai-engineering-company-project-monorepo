# Plan de pruebas — autenticación y backoffice

Última verificación: 2026-10-06. Todas las cifras de este documento salen de ejecutar los comandos de §3.

## 1. Criterios y cómo se cumplen

| Criterio | Estado | Evidencia |
|---|---|---|
| Ticket AUTH‑088 | **No verificado** | El ticket no está en el repositorio ni en GitHub, así que este plan no se ha contrastado con su texto. Si tiene criterios adicionales a los de esta tabla, hay que compararlos con §6 |
| Cobertura mínima del 70 % en autenticación | Cumplido y **comprobado automáticamente** | Backend 98 % (con ramas) en `auth`, `users`, `profiles`, `core`; frontend 100 % en cada módulo de autenticación. Un umbral hace fallar `uv run pytest --cov` y `jest --coverage` si baja (§4) |
| Estructura de tres niveles: camino feliz, límite, fallo | Cumplido en todos los ficheros nuevos | Cada fichero tiene las secciones `HAPPY PATH`, `EDGE CASES`, `FAILURE MODES`, en ese orden (§2) |
| No probar serialización HTTP | Cumplido en los tests nuevos; ver la salvedad de §2.3 | Se asertan reglas de negocio leyendo la capa de dominio. El código de estado se usa solo como «aceptado» o «rechazado» |
| Tests limpios, consistentes y con nombres claros | Cumplido | Un solo esquema de nombres (`test_<área>.py`), una frase por nombre de test, mismos helpers en `conftest.py` |
| Documentación en TESTING.md | Este documento | |
| Flujo asistido por IA evidente | Cumplido | §9 (qué hizo la IA, qué se equivocó, mutaciones) y §8 (casos límite que sugirió) |
| Pasan `uv run pytest`, `uv run pytest --cov` y `jest --coverage` | Cumplido | §3: 655 tests pasan en el backend (más 7 `xfail` que esperan una decisión) y 307 en el frontend |

### 1.1 Ticket API‑042: pruebas unitarias para los endpoints del backoffice

| Alcance del ticket | Estado | Evidencia |
|---|---|---|
| Al menos dos grupos de endpoints distintos de la autenticación | Cumplido: **dos grupos** | **Proveedores** (`/suppliers` y su alias `/api/suppliers`, 9 operaciones) y **análisis de incidencias por CSV** (`/api/incidents/analyze` y `/api/incidents/results/export`) |
| Tres niveles: camino feliz, límite, fallo | Cumplido | Secciones `HAPPY PATH`, `EDGE CASES` y `FAILURE MODES` en cada módulo nuevo (§6.9 y §6.10) |
| Cobertura del 60 % en los módulos probados | Cumplido: **87,3 %** (de 69 % antes) | Medida con los dos ficheros nuevos **solos**; el comando está en §3 y la tabla en §4.3 |
| Módulos nuevos en `tests/` | Cumplido | `test_suppliers_directory.py` (69 tests) y `test_incident_analysis.py` (58 tests) |
| `TESTING.md` actualizado con los resultados de cobertura | Cumplido | §4.3 |

**Dos precisiones sobre el ticket.** (1) Dice que la API del backoffice «nunca ha tenido batería de pruebas», pero este repositorio ya tenía `test_suppliers_endpoints.py`, `test_suppliers_validation.py` y `test_incident_manager.py` (82 tests, 97-100 % de cobertura). Los módulos nuevos no los sustituyen ni los modifican: añaden la estructura de tres niveles y cubren lo que faltaba (los dos endpoints de búsqueda, la actualización parcial con la regla moneda/país, y todo el análisis CSV, que estaba al 32-38 %). (2) El gestor de incidencias (`/api/incidents`, 7 operaciones) **no se ha duplicado**: ya está cubierto y repetirlo solo habría añadido ruido.

## 2. Estructura

### 2.1 Backend (`services/api/tests/`)

| Fichero | Qué prueba | Estilo |
|---|---|---|
| `test_register.py` | Alta pública `POST /users` | HTTP asíncrono |
| `test_login.py` | Login `POST /auth/login` | HTTP asíncrono |
| `test_session.py` | A qué da acceso un token y cuándo deja de hacerlo (rutas protegidas, roles, revocación) | HTTP asíncrono |
| `test_token.py` | Emisión, caducidad y validación del JWT; `SECRET_KEY` y duración | Unitario |
| `test_password.py` | Hash y verificación bcrypt | Unitario |
| `test_cli.py` | Comando `create-user` | Unitario |
| `test_edge_cases.py` | Casos límite sugeridos por la IA (§8), con el marcador `ai_suggested` | Mixto |
| `test_suppliers_directory.py` | Directorio de Proveedores: `/suppliers` y `/api/suppliers` (ticket API‑042) | HTTP asíncrono |
| `test_incident_analysis.py` | Análisis de incidencias por CSV y su exportación (ticket API‑042) | HTTP asíncrono |
| `test_auth.py`, `test_users.py`, `test_profiles.py`, `test_suppliers_endpoints.py`, `test_suppliers_validation.py`, `test_incident_manager.py`, `test_seed_incidents.py`, `test_architecture.py` | **Preexistentes**: no los escribí ni los reestructuré | HTTP síncrono |

- **Tres secciones en cada fichero nuevo**, en este orden: `HAPPY PATH`, `EDGE CASES`, `FAILURE MODES`. Cada test sigue Arrange / Act / Assert.
- **HTTP asíncrono** con `httpx.AsyncClient` (fixture `async_client`) y el plugin `anyio` (`pytestmark = pytest.mark.anyio`). No hace falta `pytest-asyncio`, que no está instalado.
- **Fixtures compartidos** en `conftest.py`: `users_db` y `profiles_db` (almacenes temporales con `alice` admin, `bob` y `carol` usuarios), `async_client`, `authed_client` (el mismo cliente, ya identificado como `alice`, para los grupos cuyo objetivo no es la sesión), `suppliers_db` (los 15 proveedores semilla en un almacén aislado), `anyio_backend`, `clock` (adelanta el reloj que usa la librería JWT para cruzar la caducidad sin dormir), `tokyo_timezone` (servidor en otra zona horaria) `frozen_clock` (congela el reloj en un segundo exacto, para las fronteras de `exp`) y los helpers `bearer`, `signed_token`, `jwt_segment`, `jwt_payload`.
- **Aislamiento.** Nunca se toca `users/db.json`.
- **Cada caso negativo lleva un control positivo**: el mismo caso con el dato válido pasa, para que falle solo por la causa que se prueba.

### 2.2 Frontend (`uis/backoffice/src/__tests__/`)

| Fichero | Qué prueba |
|---|---|
| `lib/token.test.ts` | Almacén del token: guardar, borrar, avisar, otras pestañas, almacenamiento bloqueado |
| `lib/returnTo.test.ts` | Redirección tras el login y protección contra *open redirect* |
| `lib/errors.test.ts` | Mensajes de error para el usuario |
| `lib/api.test.ts` | Cliente de autenticación: login, alta, llamadas autenticadas, cómo se traducen los errores |
| `lib/profileFields.test.ts` | Validador de los campos de perfil |
| `lib/signUpForm.test.ts` | Validador del alta y traductor de errores de la API |
| `lib/edgeCases.test.ts` | Casos límite sugeridos por la IA (§8): paridad con el backend y URL base |
| `auth/AuthContext.test.tsx` | Estado de la sesión, restauración al cargar, varias pestañas, alta con login automático |
| `auth/RequireAuth.test.tsx` | La guarda de rutas: nunca muestra una vista protegida sin sesión |
| `views/RegisterPage.test.tsx` | La página de registro usa el validador y el traductor de errores: no envía formularios inválidos y muestra cada error junto a su campo |

Misma estructura: un `describe` por función o área y, dentro, los bloques `happy path`, `edge cases` y `failure modes`. Los tests de `api.ts` y `errors.ts` usan el entorno `node` (docblock `@jest-environment node`) porque jsdom no incluye `fetch` ni `Response`.

### 2.3 Qué se considera «serialización HTTP» y no se prueba

No se prueban: la forma exacta del JSON de respuesta (claves, tipos, nombres de campo), cabeceras (`Content-Type`, `WWW-Authenticate`), el formato del cuerpo (JSON frente a formulario, JSON mal formado), los códigos 405 por método, la codificación de caracteres en el formulario del login ni el formato de la cabecera `Authorization` (mayúsculas del esquema, espacios).

Sí se prueba, porque es lógica de negocio: quién es el dueño de un token, cuánto dura, qué queda guardado o no, que dos rechazos sean **indistinguibles** (no revelar si una cuenta existe), que un error no repita la contraseña, y que un 401 cierre la sesión del cliente. El cliente del frontend se comprueba por su comportamiento (se guarda el token, se envía la credencial, se vacían los campos opcionales); cómo viajan los bytes lo cubren los scripts e2e de Playwright, que no forman parte de este plan.

**Salvedad.** Los tests preexistentes `test_auth.py`, `test_users.py` y `test_profiles.py` sí comprueban algunas formas de respuesta (por ejemplo, el conjunto exacto de claves de `/auth/me`). No se han modificado.

## 3. Cómo ejecutar las pruebas

```bash
# Backend (desde services/api)
uv run pytest                      # toda la suite (662 tests, ~1,5 min por bcrypt)
uv run pytest --cov                # además mide cobertura y falla por debajo del 70 %
uv run pytest tests/test_login.py  # un fichero
uv run pytest -k "expir"           # por palabra clave
uv run pytest -m ai_suggested      # solo los casos límite sugeridos por la IA

# Ticket API-042: cobertura de los módulos del backoffice con los dos ficheros nuevos SOLOS (mínimo 60 %)
uv run pytest tests/test_suppliers_directory.py tests/test_incident_analysis.py \
  --cov=suppliers --cov=incidents.router --cov=incidents.service --cov=incidents.schemas --cov=incidents_analyzer \
  --cov-branch --cov-fail-under=60

uv run pytest --cov --cov-report=html   # informe navegable en htmlcov/

# Frontend (desde uis/backoffice)
npx jest --coverage                # 307 tests (~4 s), informe HTML en coverage/index.html
npm test                           # lo mismo, sin cobertura
npx jest -t "AI-suggested"         # solo los casos límite sugeridos por la IA
```

Desde la raíz del monorepo, `npm run test:backoffice`. `pytest-cov` está en el grupo `dev` de `pyproject.toml`; `uv run` no modifica `uv.lock`.

Resultado de la última ejecución: **655 pasan y 7 `xfail`** en el backend, y **307 pasan** en el frontend (12 de ellos son `it.failing`: pasan porque la debilidad que describen sigue ahí, y fallarán el día que se corrija). Los 7 `xfail` (6 de autenticación, §8, y 1 de proveedores, §6.9) y los 12 `it.failing` esperan una decisión: no son fallos ocultos.

## 4. Cobertura

### 4.1 Cómo se hace cumplir el mínimo

- **Backend.** `pyproject.toml` tiene `[tool.coverage.run] source = ["auth", "users", "profiles", "core"]` con `branch = true`, y `[tool.coverage.report] fail_under = 70`. Con `uv run pytest --cov` (sin más opciones) se mide el dominio de autenticación y el comando **sale con error** si baja del 70 %. Comprobado: con un solo fichero de tests (27 %) el comando termina con código 1.
- **Frontend.** `jest.config.mjs` fija un umbral del 90 % (líneas, ramas, funciones y sentencias) en cada módulo de autenticación, y un suelo para `api.ts`. Comprobado: sin `errors.test.ts` el comando termina con código 1 (`errors.ts` al 0 %), y con todos los tests termina con código 0.

### 4.2 Resultado

Backend (`uv run pytest --cov`): **98,33 %** en total (553 sentencias, 6 sin cubrir; 106 ramas, 5 parciales).

| Línea sin cubrir | Qué es | Por qué |
|---|---|---|
| `auth/cli.py:37` | `main()` bajo `if __name__ == "__main__"` | Se prueba `main()` directamente |
| `core/config.py:33` | Rama de `ALLOWED_ORIGINS` (CORS) | Configuración de despliegue, no es de autenticación |
| `core/config.py:47` | Ruta del fichero de incidencias | Fuera de autenticación |
| `profiles/service.py:41`, `:89` | Ramas de migración y limpieza de perfiles | Fuera del alcance de este plan |
| `users/service.py:79` | Creación perezosa de la base real | Los tests inyectan una base temporal a propósito |

Frontend (`npx jest --coverage`):

| Fichero | Líneas | Ramas |
|---|---|---|
| `auth/AuthContext.tsx`, `auth/RequireAuth.tsx` | 100 % | 100 % |
| `lib/token.ts`, `lib/returnTo.ts`, `lib/errors.ts`, `lib/profileFields.ts`, `lib/signUpForm.ts` | 100 % | 100 % |
| `lib/api.ts` | 54 % | 73 % |
| Todos los ficheros medidos | 82 % | 91 % |

**El porcentaje de `api.ts` engaña.** Ese fichero mezcla el cliente de autenticación (`login`, `register`, `fetchMe`, `updateMyProfile`, `apiFetch`, `toApiError`, todo cubierto) con los clientes de análisis de incidencias, proveedores y gestión de incidencias, que quedan fuera de alcance. Para un número limpio habría que separar el cliente de autenticación en su propio módulo, un cambio de producción que no se ha hecho.

### 4.3 Backoffice (ticket API‑042)

El mínimo del ticket es el 60 % en los módulos probados. Se mide con **solo** los dos ficheros nuevos (comando en §3), para que la cifra sea de ellos y no de los tests que ya existían. Con toda la suite sale lo mismo, porque ningún otro test cubre las líneas que quedan.

| Módulo | Antes | Con los ficheros nuevos |
|---|---|---|
| `suppliers/router.py` | 90 % | **100 %** |
| `suppliers/service.py` | 84 % | **98 %** |
| `suppliers/schemas.py` | 97 % | **100 %** |
| `incidents/router.py` (análisis CSV) | 38 % | **100 %** |
| `incidents/service.py` (análisis CSV) | 32 % | **100 %** |
| `incidents/schemas.py` | 100 % | 100 % |
| `incidents_analyzer/core.py` (lógica compartida con el script) | 53 % | **69 %** |
| **Total de estos módulos** (líneas y ramas) | **69 %** | **87,3 %** |

Lo que no se cubre: `suppliers/service.py:59` (sembrar la base real cuando está vacía: los tests inyectan una temporal a propósito) y, en `core.py`, el informe de texto de la consola (`as_labeled_items`, `_dotted_line` y `format_report`, líneas 82-85, 235-236 y 243-305) y la lectura de `read_rows` desde un flujo o con un tipo no admitido (132-134). Todo eso lo usa el script de consola, no la API.

### 4.4 Cómo leerla

**La cobertura mide qué líneas se ejecutan, no si los asserts detectarían un fallo.** Cuando se empezó, la lógica de expiración ya tenía el 100 % de líneas y aun así había huecos reales. Por eso se hizo también una prueba de mutaciones (§9): romper el código a propósito y comprobar que algún test falla. Una mutación que sobrevive es una aserción demasiado débil, que la cobertura no ve.

## 5. Convención de las tablas siguientes

Cada tabla lista los casos de un fichero y su función de test (`test_...`, que se encuentra en ese mismo fichero). Los parametrizados cubren varias entradas con una sola función.

## 6. Plan por módulo: camino feliz, límite y fallo

### 6.1 `test_login.py` — `POST /auth/login`

| Nivel | Caso | Por qué importa | Test |
|---|---|---|---|
| Feliz | Cada usuario (admin, user) obtiene un token de **su** cuenta | Un token pertenece a quien se autentica | `test_valid_credentials_start_a_session_for_that_user_and_nobody_else` |
| Feliz | La duración anunciada es la que lleva el token | Cliente y servidor coinciden en cuándo caduca | `test_the_session_lasts_as_long_as_the_configured_lifetime` |
| Feliz | El login no altera el almacén | Un login es de solo lectura | `test_logging_in_changes_nothing_in_the_user_store` |
| Feliz | El campo OAuth2 `scope=admin` no amplía permisos | Evita la escalada por un campo estándar | `test_the_oauth2_scope_field_cannot_widen_a_session` |
| Límite | Email con otras mayúsculas o espacios | Los emails se normalizan | `test_the_email_is_matched_ignoring_case_and_surrounding_spaces` |
| Límite | Emails casi iguales son cuentas distintas | La normalización no puede unir cuentas | `test_any_other_email_is_a_different_account` |
| Límite | La contraseña es exacta (mayúsculas, espacios, prefijo) | No se recorta ni se normaliza | `test_the_password_has_to_match_exactly` |
| Límite | Faltan credenciales o están vacías | Nunca hay sesión con datos incompletos | `test_a_login_without_both_credentials_never_yields_a_session` |
| Límite | Usuario o contraseña en blanco | Un blanco es una credencial mala, no un error | `test_a_blank_username_is_a_plain_failed_login`, `test_a_blank_password_is_a_plain_failed_login` |
| Límite | La contraseña de un usuario no abre otra cuenta | Aislamiento entre cuentas | `test_one_users_password_never_opens_another_account` |
| Límite | Usernames hostiles (inyección, `\x00`, 10 000 caracteres) | Una entrada de atacante no provoca errores ni coincidencias | `test_hostile_usernames_are_just_wrong_emails` |
| Límite | Contraseñas de 100 000 caracteres, multibyte o con `\x00` | bcrypt solo lee 72 bytes: ni excepciones ni truncado | `test_hostile_or_oversized_passwords_are_a_refusal_not_an_error` |
| Fallo | Usuario inexistente, contraseña mala y cuenta desactivada: **misma** respuesta | Si difieren, se pueden enumerar cuentas | `test_unknown_email_wrong_password_and_deactivated_account_look_exactly_alike` |
| Fallo | Un email inexistente cuesta igualmente una verificación bcrypt | El tiempo de respuesta no delata qué emails existen | `test_an_unknown_email_still_pays_for_a_password_check` |
| Fallo | El rechazo no nombra la cuenta ni el motivo | No filtrar información | `test_a_refusal_never_names_the_account_or_the_reason` |
| Fallo | Un login rechazado no deja rastro | Estado intacto | `test_a_refused_login_leaves_no_trace_in_the_store` |
| Fallo | Los errores de validación no repiten la contraseña | Los 422 por defecto repiten el `input`, y acabaría en logs | `test_validation_errors_never_echo_the_password_back` |
| Fallo | Cuenta desactivada y luego reactivada; cuenta borrada | El estado se lee del almacén | `test_a_deactivated_account_is_refused_until_it_is_reactivated`, `test_a_deleted_account_can_no_longer_log_in` |
| Fallo | Duración mal configurada: no se emite ningún token | Mejor fallar que emitir tokens sin caducidad | `test_a_misconfigured_token_lifetime_never_yields_a_token` |

### 6.2 `test_register.py` — `POST /users`

| Nivel | Caso | Por qué importa | Test |
|---|---|---|---|
| Feliz | Cuenta activa con rol `user`, que puede entrar de inmediato | Contrato del registro | `test_a_new_account_is_created_active_with_the_user_role_and_can_sign_in_at_once` |
| Feliz | La contraseña se guarda solo como hash bcrypt | Nunca en claro | `test_the_password_is_stored_only_as_a_bcrypt_hash` |
| Feliz | Un perfil por cuenta, con un nombre por defecto | Relación uno a uno | `test_every_account_gets_exactly_one_profile_named_after_the_email_by_default` |
| Feliz | Los datos de perfil van al perfil, no al usuario | Separación de datos | `test_the_optional_profile_data_goes_to_the_profile_and_not_to_the_user` |
| Límite | Email recortado y en minúsculas | Normalización | `test_the_email_is_stored_trimmed_and_lower_cased` |
| Límite | `alice+news@…` es otro email | El `+` es válido | `test_a_plus_tag_makes_a_different_email` |
| Límite | Contraseña de 8 a 72 **bytes**, sin `\x00` | bcrypt lee 72 bytes: se rechaza en vez de truncar | `test_the_password_must_be_8_to_72_bytes_without_nul_bytes` |
| Límite | La contraseña se guarda tal cual, con sus espacios | No se recorta | `test_the_password_is_kept_exactly_as_typed_including_spaces` |
| Límite | Credenciales ausentes, vacías o nulas | Nada se crea | `test_missing_or_empty_credentials_are_refused_and_nothing_is_created` |
| Límite | Emails mal formados | Validación de formato | `test_a_malformed_email_is_refused_and_nothing_is_created` |
| Fallo | Email ya registrado, en cualquier forma (mayúsculas, espacios, «Nombre <correo>») | Un email = una cuenta | `test_an_email_that_is_already_registered_is_refused_in_any_spelling` |
| Fallo | Un duplicado no sirve para tomar la cuenta existente | Un 409 no puede cambiar la contraseña | `test_a_refused_duplicate_cannot_be_used_to_take_over_the_existing_account` |
| Fallo | Dos altas seguidas: una cuenta, gana la primera contraseña | Una sola cuenta resultante | `test_registering_twice_leaves_one_account_and_the_first_password_wins` |
| Fallo | El duplicado se rechaza antes de usar sus datos de perfil | Los datos del intruso no se guardan | `test_a_duplicate_is_refused_before_its_profile_data_is_used` |
| Fallo | `role`, `is_active`, `id`, `hashed_password`… se rechazan | No se fija estado privilegiado desde el alta pública | `test_sign_up_cannot_set_privileged_or_internal_state` |
| Fallo | Un alta rechazada no repite la contraseña | No filtrar secretos | `test_a_refused_sign_up_never_echoes_the_password_back` |
| Fallo | `\x00` en una contraseña nueva: se rechaza y se conserva la anterior | Corrección de un 500 (§7) | `test_a_nul_byte_in_a_new_password_is_refused_and_keeps_the_old_one` |

### 6.3 `test_token.py` — el token como unidad

| Nivel | Caso | Por qué importa | Test |
|---|---|---|---|
| Feliz | Un token identifica la cuenta para la que se emitió (UUID o texto) | Es la identidad de la sesión | `test_a_token_identifies_the_account_it_was_issued_for` |
| Feliz | Solo lleva `user_id` y `exp` | Sin email, rol ni hash: los permisos se leen en vivo | `test_a_token_carries_only_the_account_id_and_an_expiry` |
| Feliz | Cada cuenta, su token; firmado con la clave y el algoritmo configurados | Integridad | `test_every_account_gets_its_own_token`, `test_a_token_is_signed_with_the_configured_secret_and_algorithm` |
| Feliz | La duración se lee al emitir, no al importar | Un cambio de configuración se nota | `test_the_lifetime_is_read_every_time_a_token_is_issued_not_once_at_import` |
| Límite | Válido hasta que pasa su vida útil y no después (reloj adelantado) | Detecta justo el fallo de producción: un refactor que rompe cuándo caduca | `test_a_token_is_valid_until_its_lifetime_has_passed_and_not_after` |
| Límite | La sesión por defecto dura 30 minutos | Fija el contrato | `test_the_default_session_lasts_thirty_minutes` |
| Límite | Un token conserva la duración con la que se emitió | Un cambio posterior no lo alarga | `test_a_token_keeps_the_lifetime_it_was_issued_with` |
| Límite | La caducidad es un instante absoluto, sea cual sea la zona horaria del servidor | Un `datetime.now()` sin zona la desplazaría horas | `test_the_expiry_is_an_absolute_instant_whatever_the_servers_timezone` |
| Límite | Un token con `nbf` futuro se rechaza hasta su inicio | Token aún no válido | `test_a_token_that_is_not_valid_yet_is_rejected_until_its_start_time` |
| Límite | `SECRET_KEY` se usa tal cual y es estable en el proceso | Configuración | `test_the_secret_key_from_the_environment_is_used_as_is`, `test_the_secret_is_stable_within_the_process` |
| Límite | Duración sin configurar o válida | Valor por defecto de 30 minutos | `test_the_token_lifetime_setting_falls_back_to_thirty_minutes_when_unset` |
| Fallo | Basura nunca es una sesión | Entrada arbitraria no da acceso | `test_garbage_is_never_a_session` |
| Fallo | Payload editado, firma cambiada, ausente o truncada | La firma es lo que impide suplantar | `test_a_good_token_that_was_tampered_with_is_rejected` |
| Fallo | Firmado con otra clave | Solo el servidor firma | `test_a_token_signed_with_another_key_is_rejected` |
| Fallo | Otros algoritmos (HS384, HS512) con la clave correcta | El algoritmo está fijado | `test_other_hmac_algorithms_are_refused_even_with_the_right_key` |
| Fallo | `alg: none` y variantes | Ataque clásico de token sin firma | `test_unsigned_tokens_are_refused_whatever_they_claim` |
| Fallo | `exp` o `user_id` con valores erróneos, y ambos obligatorios | Todo token caduca y nombra una cuenta | `test_a_signed_token_with_wrong_claims_is_rejected`, `test_both_claims_are_required` |
| Fallo | `exp` nulo o lista: se rechaza, no se rompe | Corrección de un 500 (§7) | `test_a_non_numeric_exp_is_a_rejected_token_not_a_crash` |
| Fallo | `SECRET_KEY` demasiado corta se rechaza; sin clave, aleatoria y con aviso | Seguridad de la clave | `test_a_too_short_secret_key_is_refused_rather_than_accepted`, `test_without_a_secret_key_a_strong_random_one_is_used_and_a_warning_is_logged` |
| Fallo | Duración absurda (0, negativa, texto) se rechaza | No se convierte en un valor por defecto | `test_a_nonsensical_token_lifetime_is_refused_not_turned_into_a_default` |

### 6.4 `test_session.py` — sesiones sobre la API

| Nivel | Caso | Por qué importa | Test |
|---|---|---|---|
| Feliz | Un token abre una sesión como esa cuenta y nadie más | Identidad | `test_a_login_token_opens_a_session_as_that_account_and_nobody_else` |
| Feliz | Dos logins, dos sesiones independientes | Los tokens son sin estado | `test_two_logins_give_two_independent_sessions_and_neither_cancels_the_other` |
| Límite | La sesión funciona hasta su duración y no después | Caducidad de extremo a extremo | `test_a_session_works_until_the_configured_lifetime_and_not_after` |
| Límite | Un token caducado se rechaza en **todas** las rutas protegidas | Todas comparten la validación | `test_an_expired_token_is_refused_on_every_protected_route` |
| Límite | Un cambio de rol se aplica al mismo token, en los dos sentidos | Los permisos no viajan en el token | `test_a_role_change_applies_to_the_same_token_at_once_in_both_directions` |
| Límite | `user` y `manager` no pasan las rutas solo-admin | `manager` no tiene poderes de admin | `test_admin_only_routes_refuse_every_non_admin_role` |
| Límite | Desactivar y reactivar una cuenta apaga y enciende sus sesiones | Estado en vivo | `test_deactivating_an_account_switches_its_sessions_off_and_reactivating_it_back_on` |
| Límite | El token solo se lee de la cabecera `Authorization` | Ni query, ni cookie, ni otras cabeceras | `test_a_token_is_only_read_from_the_authorization_header` |
| Límite | Un token enorme se rechaza | Robustez | `test_an_enormous_token_is_refused_not_a_crash` |
| Fallo | Todos los motivos de rechazo dan **la misma** respuesta | No dar pistas sobre por qué falló | `test_every_reason_for_refusing_a_token_gets_the_same_answer` |
| Fallo | Sin credenciales o con otro esquema no hay sesión | Solo `Bearer` | `test_a_request_without_a_bearer_token_is_not_a_session` |
| Fallo | La firma de Bob no se traslada a los datos de Alice (admin) | El ataque de escalada más relevante | `test_a_users_signature_cannot_be_moved_onto_another_users_claims` |
| Fallo | Token sin firma de un admin; token con otro algoritmo | Falsificación | `test_an_unsigned_token_for_an_admin_is_refused`, `test_a_token_signed_with_the_right_key_but_another_algorithm_is_refused` |
| Fallo | Cuenta borrada: su token muere y un alta nueva con el mismo email es otra identidad | El token lleva el UUID, no el email | `test_a_deleted_account_loses_its_token_and_a_new_account_with_the_same_email_is_someone_else` |
| Fallo | La sesión de un usuario nunca llega a datos ajenos | Aislamiento | `test_one_users_session_never_reaches_another_users_data` |

### 6.5 `test_password.py` — hash

| Nivel | Caso | Test |
|---|---|---|
| Feliz | Hash bcrypt con sal propia que nunca contiene la contraseña; la correcta verifica | `test_a_password_is_stored_as_a_salted_bcrypt_hash_that_never_contains_it`, `test_the_right_password_verifies_against_its_hash` |
| Límite | Solo verifica la contraseña exacta; el límite de 72 bytes se respeta sin truncar; 72 bytes multibyte | `test_only_the_exact_password_verifies`, `test_bcrypts_72_byte_limit_is_honoured_instead_of_silently_truncating`, `test_a_password_of_72_bytes_made_of_multibyte_characters_round_trips` |
| Fallo | Un hash mal formado no verifica ni lanza; el texto en claro no es un hash válido; `\x00` es una discrepancia, no un error | `test_a_malformed_stored_hash_never_verifies_and_never_raises`, `test_a_password_stored_in_plain_text_would_not_verify`, `test_a_nul_byte_in_the_attempt_is_a_plain_mismatch_not_an_error` |

### 6.6 `test_cli.py` — `create-user`

| Nivel | Caso | Test |
|---|---|---|
| Feliz | Crea un usuario normal que puede autenticarse y tiene perfil; `--role admin`; guarda solo el hash | `test_creates_a_regular_user_that_can_authenticate_and_has_a_profile`, `test_role_admin_creates_an_admin`, `test_the_password_is_stored_only_as_a_hash` |
| Límite | Contraseña corta o vacía; que bcrypt no puede hashear; email mal formado: se rechazan sin repetir la contraseña | `test_a_password_under_the_minimum_is_refused_without_echoing_it`, `test_a_password_bcrypt_cannot_hash_is_refused_not_a_crash`, `test_a_malformed_email_is_refused` |
| Fallo | Las contraseñas no coinciden; email existente (no cambia su contraseña); rol desconocido; falta el email | `test_mismatching_passwords_create_nobody`, `test_an_existing_email_is_refused_and_its_password_is_left_alone`, `test_an_unknown_role_is_refused_by_the_argument_parser`, `test_the_email_is_required` |

### 6.7 `test_edge_cases.py` — casos límite sugeridos por la IA

Los comentarios de cabecera del fichero explican qué significa cada nivel en este módulo: lo robusto hoy, las fronteras escritas, y las debilidades pendientes de decisión (`xfail(strict=True)`). Detalle y estado de cada una en §8.

| Nivel | Caso | Test |
|---|---|---|
| Feliz | Cambiar un solo carácter de un token nunca produce un token aceptado (680 variantes) | `test_a_token_with_any_single_character_changed_is_never_accepted` |
| Feliz | 20 altas simultáneas con el mismo email, en un proceso: una cuenta y 19 rechazos | `test_twenty_simultaneous_sign_ups_with_the_same_email_create_exactly_one_account` |
| Feliz | Un preflight CORS desde un origen ajeno se rechaza | `test_a_cors_preflight_from_an_unknown_origin_is_refused` |
| Feliz | Un email con un carácter invisible se rechaza | `test_an_email_with_an_invisible_character_is_refused` |
| Límite | El token vale hasta su segundo `exp` (inclusive) y caduca un segundo después | `test_a_token_is_valid_through_its_exp_second_and_expires_one_second_later` |
| Límite | Campos opcionales: omitidos o `null` sí; `""` y en blanco no | `test_optional_profile_fields_may_be_omitted_or_null_but_not_empty_or_blank` |
| Límite | Los límites de nombre y de contraseña cuentan caracteres, no bytes | `test_the_profile_name_limit_counts_characters_not_bytes`, `test_the_password_minimum_counts_characters_not_bytes` |
| Fallo (`xfail`) | La misma contraseña en NFC y en NFD debería entrar | `test_the_same_password_typed_in_nfc_or_nfd_logs_in` |
| Fallo (`xfail`) | Un email que imita a otro con otro alfabeto debería rechazarse | `test_an_email_that_imitates_an_existing_one_with_another_alphabet_is_refused` |
| Fallo (`xfail`) | El directorio no debería revelar la parte local del email | `test_the_user_directory_does_not_reveal_other_peoples_email_local_parts` |
| Fallo (`xfail`) | Una duración absurda debería rechazarse en la configuración | `test_an_absurd_token_lifetime_is_refused_by_the_configuration` |
| Fallo (`xfail`) | Un token debería tener una única forma textual válida | `test_a_token_has_exactly_one_valid_textual_form` |
| Fallo (`xfail`) | Un POST con barra final no debería redirigir | `test_a_credentials_post_to_a_url_with_a_trailing_slash_is_not_redirected` |

### 6.8 Gestión de cuentas (preexistente)

`test_users.py` (49 tests) y `test_profiles.py` (27) fijan las reglas de `/users/{id}` y `/profiles`: solo el propietario o un admin leen, editan o borran (todo lo demás es 403, incluso con ids inexistentes, para no sondear cuentas); cambiar el email o la contraseña exige la contraseña actual; solo un admin cambia `role` o `is_active`; el último usuario o el último admin activo no se pueden borrar, degradar ni desactivar.

### 6.9 `test_suppliers_directory.py` — Directorio de Proveedores (`/suppliers`, `/api/suppliers`)

Los 15 proveedores semilla: ids 1 a 15, 8 en España (EUR) y 7 en EE. UU. (USD); Greenhouse y Coursera están suspendidos. Las aserciones se hacen sobre el almacén (`suppliers.service`), no sobre el JSON.

| Nivel | Caso | Por qué importa | Test |
|---|---|---|---|
| Feliz | El directorio lista los 15 proveedores | Contrato básico | `test_the_directory_lists_every_supplier` |
| Feliz | Un proveedor se lee por su id | | `test_a_supplier_is_read_by_its_id` |
| Feliz | Un alta recibe el siguiente id y se puede leer de nuevo | El proveedor existe de verdad en el almacén | `test_a_new_supplier_is_added_with_the_next_id_and_can_be_read_back` |
| Feliz | Filtrar por país o por categoría | Casos de uso principales de la página | `test_the_directory_can_be_filtered_by_country_or_category` |
| Feliz | Los dos endpoints de búsqueda dan lo mismo que los filtros | Eran los dos únicos endpoints sin cubrir | `test_the_search_endpoints_find_the_same_suppliers_as_the_directory_filters` |
| Feliz | Cambiar la tarifa mensual marca la hora del cambio | `updated_at` es la fecha de la última tarifa | `test_changing_the_monthly_rate_stamps_the_time_of_the_change` |
| Feliz | Suspender y reactivar conserva el historial | El contexto prefiere suspender antes que borrar | `test_a_supplier_can_be_suspended_and_reactivated_and_the_history_is_kept` |
| Feliz | Una actualización parcial cambia solo lo enviado | No pisar datos | `test_a_partial_update_changes_only_the_fields_that_were_sent` |
| Feliz | Un proveedor se elimina de verdad | | `test_a_supplier_is_removed_for_good` |
| Feliz | El alias `/api/suppliers` sirve y cambia el mismo directorio | Es la ruta que usa el backoffice | `test_the_backoffice_alias_serves_and_changes_the_same_directory` |
| Límite | Los filtros se combinan con AND; sin coincidencias, lista vacía | País + categoría restringen, no amplían | `test_country_and_category_filters_combine_with_and_and_no_match_is_an_empty_list` |
| Límite | Un proveedor con varias categorías sale en cada una | | `test_a_supplier_with_several_categories_is_found_under_each_of_them` |
| Límite | Una actualización vacía no cambia nada | | `test_an_update_with_nothing_in_it_changes_nothing` |
| Límite | La marca de tiempo solo sigue a los cambios de tarifa (no al mismo valor ni al estado) | Evita fechas que mienten | `test_the_timestamp_only_follows_changes_of_the_rate` |
| Límite | La tarifa debe ser mayor que cero (0,01 sí; 0 y negativos no) | Frontera de la regla | `test_the_monthly_rate_must_be_greater_than_zero` |
| Límite | Los campos opcionales pueden omitirse o ser `null` | | `test_the_optional_fields_may_be_left_out_or_null` |
| Límite | Cambiar de país es válido si la moneda cambia con él | La regla moneda/país se evalúa sobre el registro completo | `test_a_supplier_can_change_country_when_the_currency_changes_with_it` |
| Límite | Ids 0, negativos o inexistentes: no encontrado | | `test_an_id_outside_the_directory_is_simply_not_found` |
| Fallo | Cualquier operación sobre un proveedor inexistente da no encontrado y no cambia nada | 5 operaciones | `test_every_operation_on_an_unknown_supplier_is_not_found_and_changes_nothing` |
| Fallo | La moneda debe corresponder al país al crear | España con USD, EE. UU. con EUR | `test_the_currency_has_to_match_the_country_when_a_supplier_is_created` |
| Fallo | Una actualización que rompería la regla se rechaza y el proveedor queda intacto | Cambiar solo país o solo moneda | `test_an_update_that_would_break_the_currency_rule_is_refused_and_leaves_the_supplier_untouched` |
| Fallo | Un dato inválido nunca llega al almacén, ni al crear ni al actualizar | Estado, tarifa, nombre, categorías, país, `updated_at`/`id` enviados por el cliente, campos extra | `test_invalid_data_never_reaches_the_store_on_create_or_update` |
| Fallo | Un filtro con un valor desconocido o ausente se rechaza, no devuelve una lista vacía | Una errata no debe parecer «no hay proveedores» | `test_a_filter_with_an_unknown_or_missing_value_is_refused_rather_than_answered_with_an_empty_list` |
| Fallo | Todo el directorio exige sesión y nada cambia sin ella | 11 operaciones, en las dos rutas | `test_the_whole_directory_needs_a_session_and_nothing_changes_without_one` |
| Fallo | Un proveedor eliminado ya no se puede modificar | | `test_a_removed_supplier_can_no_longer_be_changed` |
| Fallo (`xfail`) | Reenviar la tarifa que ya tiene no debería mover `updated_at` | Hallazgo de la IA (§8, #11) | `test_sending_the_rate_a_supplier_already_has_does_not_move_the_timestamp` |

### 6.10 `test_incident_analysis.py` — análisis de incidencias por CSV

Las reglas vienen de `scripts/CONTEXT-nexova.md`: un registro es inválido por siete motivos, un ticket `CLOSED` necesita una nota de 1 a 5, y el correo del cliente solo se usa para comprobar que tiene `@`: nunca debe salir en ninguna respuesta.

| Nivel | Caso | Por qué importa | Test |
|---|---|---|---|
| Feliz | Un fichero válido se analiza y cada registro se cuenta una vez | Números que lee el responsable de soporte | `test_a_valid_file_is_analysed_and_every_record_is_counted_once` |
| Feliz | El índice de satisfacción solo usa tickets cerrados | Una nota en un ticket abierto no es satisfacción | `test_the_satisfaction_index_is_built_only_from_closed_tickets` |
| Feliz | La exportación entrega el último análisis, una métrica por fila | Para pegarlo en la plantilla del informe | `test_the_export_gives_the_last_analysis_as_one_metric_per_row` |
| Feliz | El análisis queda en memoria para la exportación | | `test_the_analysis_is_kept_in_memory_for_the_export` |
| Feliz | La API y el script de consola dan los mismos números con el fichero real | Regla del proyecto: la lógica debe ser idéntica | `test_the_api_and_the_cli_script_give_the_same_numbers_on_the_real_export` |
| Límite | BOM y finales de línea de Windows no cambian el resultado | Los exporta así Excel | `test_a_byte_order_mark_and_windows_line_endings_do_not_change_the_analysis` |
| Límite | La extensión se comprueba sin distinguir mayúsculas | | `test_the_file_extension_is_checked_ignoring_case` |
| Límite | Los valores se comparan sin los espacios alrededor | | `test_values_are_compared_ignoring_the_spaces_around_them` |
| Límite | Las columnas desconocidas se ignoran | | `test_columns_the_analysis_does_not_know_are_ignored` |
| Límite | Cada una de las reglas invalida un registro y se cuenta solo bajo su nombre (19 casos) | Las siete reglas de validez | `test_each_rule_marks_a_record_invalid_and_is_counted_under_its_own_name` |
| Límite | Los valores en el borde de cada regla siguen siendo válidos | Descripción de 5, notas 1 y 5, agente `AGT-00`… | `test_the_values_at_the_edge_of_each_rule_are_still_valid` |
| Límite | Un registro que rompe varias reglas es un solo inválido pero cuenta en cada regla | El desglose puede sumar más que los inválidos | `test_a_record_breaking_several_rules_is_one_invalid_record_but_is_counted_under_each_rule` |
| Límite | Un registro inválido no entra en categorías, estados ni satisfacción | | `test_an_invalid_record_is_left_out_of_the_category_status_and_satisfaction_counts` |
| Límite | Porcentajes con un decimal y la media con dos | 66,7 % / 33,3 % y 4,33 | `test_percentages_have_one_decimal_and_the_average_two` |
| Límite | Sin registros válidos: porcentajes en cero, sin media y vacía en la exportación | Nunca una división por cero ni un cero inventado | `test_a_file_with_no_valid_record_has_no_percentages_to_divide_and_no_average` |
| Límite | Un segundo fichero sustituye al análisis anterior | | `test_a_second_upload_replaces_the_previous_analysis` |
| Fallo | Un fichero que no es CSV se rechaza y no se analiza nada | | `test_a_file_that_is_not_a_csv_is_refused_and_nothing_is_analysed` |
| Fallo | Un fichero que no es texto UTF‑8 se rechaza | | `test_a_file_that_is_not_utf8_text_is_refused` |
| Fallo | Las columnas obligatorias que faltan se nombran en el rechazo | El usuario sabe qué corregir | `test_missing_required_columns_are_named_in_the_refusal` |
| Fallo | Un fichero vacío, solo con cabecera o con una línea en blanco se rechaza | | `test_a_file_without_data_is_refused_and_nothing_is_analysed` |
| Fallo | Una subida rechazada no pisa el análisis que ya había | | `test_a_refused_upload_does_not_replace_the_analysis_already_there` |
| Fallo | Exportar sin haber analizado nada: no encontrado | | `test_exporting_before_any_analysis_is_not_found` |
| Fallo | Una petición sin fichero se rechaza, no es un error | | `test_a_request_without_a_file_is_refused_not_an_error` |
| Fallo | Los correos de los clientes no salen nunca, ni en la respuesta ni en la exportación | Privacidad: regla del contexto | `test_customers_emails_never_come_back_in_the_response_or_the_export` |
| Fallo | El análisis y la exportación exigen sesión y no guardan nada sin ella | | `test_the_analysis_and_the_export_need_a_session_and_store_nothing_without_one` |

## 7. Frontend: casos probados

### 7.1 Inventario de utilidades TypeScript de autenticación

| Tipo | Función | Fichero | Camino feliz | Modo de fallo |
|---|---|---|---|---|
| Helpers de token | `getToken`, `setToken`, `clearToken`, `onTokenChange`, `onTokenChangeInOtherTab` | `lib/token.ts` | Guardar, leer, borrar, avisar | Almacenamiento bloqueado, claves ajenas, darse de baja |
| Parser | `safeReturnTo`, `loginUrl`, `currentReturnTo` | `lib/returnTo.ts` | Rutas locales y codificación | `//host`, `https://`, `javascript:`, caracteres de control |
| Parser | `describeError`, `isConflict`, `isNotFound` | `lib/errors.ts` | Cada código, su mensaje | Valores que no son `ApiError`; 5xx sin filtrar el texto del servidor |
| Parser | `toApiError` (privada, probada vía `fetchMe` y `login`) | `lib/api.ts` | `detail` en texto o lista 422 | HTML, vacío, `null`, `detail` numérico |
| Cliente | `login`, `register`, `fetchMe`, `updateMyProfile`, `apiFetch` | `lib/api.ts` | El token se guarda y se envía | 401 cierra la sesión; 403/404/409/422/5xx la conservan; servidor inalcanzable |
| Validador | `validateProfileFields` | `lib/profileFields.ts` | Perfil válido; opcionales vacíos | Nombre obligatorio, límites, teléfono, varios errores a la vez |
| Validador | `validateSignUp` | `lib/signUpForm.ts` | Formulario válido | Email, contraseña (8 a 72 bytes), confirmación, perfil |
| Parser | `signUpErrorFromApi` | `lib/signUpForm.ts` | 409 y 422 con campos conocidos | Errores que no son de la API; 4xx/5xx sin filtrar el texto |
| Hash helpers | — | — | — | **No hay ninguno en TypeScript**: las contraseñas se hashean solo en el servidor (bcrypt) |
| (Fuera de alcance) | `isValidEmail` y demás | `src/utils/validations.ts` | — | Valida candidatos y vacantes, no autenticación |

**Cambio de producción asociado.** Para poder probar el validador y el traductor de errores del alta, que eran funciones privadas de `views/RegisterPage.tsx`, se movieron tal cual a `lib/signUpForm.ts` (`validate` → `validateSignUp`, `fromApiError` → `signUpErrorFromApi`) y la página las importa. Extracción sin cambio de comportamiento: `typecheck` y `next build` pasan, y un test de componente (`views/RegisterPage.test.tsx`) comprueba que la página sigue usando esas funciones: no valida ni envía un formulario inválido, pone cada error junto a su campo, recorta los campos opcionales y trata el alta sin login automático. Los scripts e2e de Playwright no se ejecutaron (necesitan descargar Chromium y levantar la API y la aplicación).

### 7.2 Casos por área

| Área | Camino feliz | Casos límite | Modos de fallo |
|---|---|---|---|
| `token.ts` | Guardar y leer bajo `nexova.token`; borrar; avisar a los oyentes; otra pestaña inicia o cierra sesión | Sin sesión; reemplazar; borrar sin token; no tocar otras claves; `localStorage.clear()` de otra pestaña (el evento no trae clave); la propia pestaña no se avisa a sí misma | Almacenamiento bloqueado al leer, escribir y borrar; darse de baja; almacenamiento ilegible entre medias |
| `returnTo.ts` | Rutas locales aceptadas; la ruta se codifica | Vacío, `null`, `/` omitido; consulta y *hash* codificados; `?next=` repetido | `//host`, `https://`, `javascript:`, `data:`; `/\t/evil` y demás caracteres de control; **invariante: lo aceptado siempre resuelve al mismo origen** |
| `errors.ts` | Cada código a su mensaje | Frontera 499/500; error de cliente sin mensaje | Valores que no son `ApiError`; los 5xx nunca filtran el texto del servidor |
| `api.ts` | Login guarda el token y avisa; alta devuelve la cuenta sin iniciar sesión; llamada autenticada lleva el token | Sin token no hay credencial; 401 sin token no hace nada; **401 tardío de un token antiguo no cierra una sesión nueva**; el login no envía un token viejo; los opcionales vacíos no se envían | Credenciales malas, 422 por campos, red caída, página HTML de un gateway, un 200 sin token válido (nunca guarda `"undefined"`), 401 cierra sesión |
| `AuthContext` | Restaurar la sesión solo si `/auth/me` acepta el token; login; logout; alta con login automático; perfil; otras pestañas | Una caducidad no cuenta como logout; respuesta tardía de un proveedor desmontado; nuevo login con la sesión abierta sin pasar por «anónimo»; otra pestaña vacía el almacén | Token rechazado; credenciales malas; alta con cuenta creada pero login fallido («created», nunca un fallo); alta rechazada; token falso de otra pestaña; guardado rechazado; `useAuth` fuera del proveedor |
| `RegisterPage` | Envía las credenciales y los opcionales rellenados, recortados | Un error se borra al editar su campo; alta creada sin login automático; ya autenticado no ve el formulario | Un formulario inválido nunca se envía y se informan todos los errores; 409 bajo el email; 422 bajo su campo; un error ajeno a la API da un mensaje genérico sin su texto |
| `RequireAuth` | Con sesión muestra la vista; mientras comprueba muestra una espera | Redirige a `/login?next=<página>`; desde `/` sin `?next=`; logout explícito va a `/login` sin `?next=`; token borrado a mano se nota en la siguiente navegación | **Sin sesión la vista protegida nunca se renderiza, ni una vez**; token rechazado; sesión que caduca con la vista abierta; otra pestaña cierra sesión; almacenamiento bloqueado |

La guarda de la interfaz **no es** la frontera de seguridad: la API responde 401 sin un token válido, y eso se prueba en el backend (`test_session.py`).

## 8. Casos límite sugeridos por la IA

La IA sondeó el sistema con unas 60 entradas hostiles, 10 647 mutaciones de un token y 4 680 entradas contra `safeReturnTo`, sin modificar el repositorio. Cada hallazgo tiene ya su test, marcado `ai_suggested` (pytest; el #11 sale del ticket API‑042) o `AI-suggested` (Jest). Lo que hoy se cumple es un test normal; lo que depende de una **decisión de diseño** está escrito como el comportamiento deseado y marcado `xfail(strict=True)` o `it.failing`, con la decisión pendiente en el motivo. «Estricto» significa que la suite falla el día que el código empiece a cumplirlo, y entonces se quita la marca. **Ningún caso modifica el código de producción.** Las severidades son un criterio de la IA.

| # | Hallazgo (comprobado) | Gravedad | Test | Estado |
|---|---|---|---|---|
| 1 | **TinyDB con varios procesos**: 8 procesos dando de alta el mismo email contra el mismo fichero produjeron 2 y 3 cuentas duplicadas, `JSONDecodeError`, y en un intento un fichero ilegible | Alta si se despliega con varios *workers* | Con un proceso: `test_twenty_simultaneous_sign_ups_…` (pasa). Entre procesos: **sin test**, porque la carrera no es determinista y un test así sería inestable | Decisión: ¿cuántos workers usa el despliegue? |
| 2 | **La contraseña no se normaliza en Unicode**: dada de alta en NFC, el login con la misma en NFD da `401` | Media | `test_the_same_password_typed_in_nfc_or_nfd_logs_in` | `xfail`: ¿normalizar (NIST SP 800‑63B)? |
| 3 | **Emails homógrafos aceptados** (`аlice@…` con «а» cirílica, ancho completo, `İ`), y el directorio muestra a cualquier sesión el nombre por defecto, que es la parte local del email | Media | `test_an_email_that_imitates_…`, `test_the_user_directory_does_not_reveal_…`; pasa `test_an_email_with_an_invisible_character_is_refused` | 2 `xfail`: ¿restringir alfabetos? ¿qué debe exponer el directorio? |
| 4 | **`ACCESS_TOKEN_EXPIRE_MINUTES` ≥ 10¹⁰** pasa la validación y cada login da `500` (`OverflowError`) | Baja | `test_an_absurd_token_lifetime_is_refused_by_the_configuration` | `xfail`: ¿poner un tope? |
| 5 | **Los validadores del frontend y del backend no coinciden**: el front acepta 9 emails que el backend rechaza; JS cuenta unidades UTF‑16 y Python caracteres (4 emoji pasan el mínimo de 8 del front; 41 emoji superan el límite de 80 del front pero no el del backend) | Baja | `edgeCases.test.ts`: 12 `it.failing` y los casos de acuerdo, que pasan | `it.failing`: ¿paridad exacta? |
| 6 | **Maleabilidad de la firma**: 3 de 10 647 mutaciones se aceptaron, todas en el último carácter (bits de relleno de base64) | Baja hoy | `test_a_token_has_exactly_one_valid_textual_form`; pasa `test_a_token_with_any_single_character_changed_is_never_accepted` | `xfail`: importa si algún día se bloquean tokens por su texto |
| 7 | **Barra final**: `POST /users/` y `/auth/login/` responden `307` con `Location` construido desde la petición; una `NEXT_PUBLIC_API_BASE_URL` con barra final genera `//auth/login` (`404`) | Baja | `test_a_credentials_post_to_a_url_with_a_trailing_slash_is_not_redirected`; en el frontend, `builds a clean URL when the API base URL ends with a slash` | `xfail` e `it.failing`. No se comprobó el despliegue real |
| 8 | **Campo `username` repetido** en el login: gana el último | Baja | **Sin test**: es parseo del formulario HTTP, fuera de alcance (§2.3) | Decisión: ¿rechazar? |
| 9 | **Campos opcionales**: `null` se acepta y `""` se rechaza en `name`, `phone` y `address` | Baja | `test_optional_profile_fields_may_be_omitted_or_null_but_not_empty_or_blank` | Pasa: fija el contrato actual |
| 10 | **Frontera de caducidad inclusiva**: el token vale «justo en `exp`» y caduca un segundo después | Baja | `test_a_token_is_valid_through_its_exp_second_and_expires_one_second_later` | Pasa: fija el comportamiento actual |
| 11 | **`PATCH /suppliers/{id}/rate` con la tarifa que ya tiene mueve `updated_at`**, mientras que `PATCH /suppliers/{id}` con el mismo valor no. El esquema dice que la marca sigue a los cambios de tarifa (ticket API‑042) | Baja | `test_sending_the_rate_a_supplier_already_has_does_not_move_the_timestamp` | `xfail`: ¿es un error o es deseado? |

Lo que **aguantó** y ahora es un test normal: cambiar cualquier carácter de un token (salvo el último, #6), 20 altas simultáneas en un proceso, el preflight CORS desde un origen ajeno (`400`, sin `Access-Control-Allow-Origin`) y el espacio de ancho cero en el email. Además, `safeReturnTo` resistió 4 680 entradas sin que ninguna escapara del origen (ver `returnTo.test.ts`), y los tokens con basura estructural no lanzan excepciones (`test_garbage_is_never_a_session`).

## 9. Flujo asistido por IA

Este plan y los tests se desarrollaron con un asistente de IA (Claude Code). Este apartado deja constancia de qué hizo, qué verificó y qué debe revisar una persona.

### 9.1 Qué aportó la IA

- Revisó el código y la suite que ya existía (268 tests, 116 de ellos de autenticación, usuarios y perfiles), midió la cobertura y propuso los casos nuevos.
- Hizo una **prueba de mutaciones manual**: rompió el código a propósito, una vez cada vez, y ejecutó los tests.

| Ronda | Mutaciones | Detectadas a la primera | Qué se encontró |
|---|---|---|---|
| Backend, con los tests originales | 36 | 32 | 3 huecos reales (`user_id` entero de 32 dígitos, `SECRET_KEY` corto, `manager` en rutas solo-admin) y 1 equivalente (`verify_exp off`: la librería fuerza la verificación cuando `exp` es obligatorio) |
| Backend, tras añadir los tests | 46 | 45 | Solo la equivalente |
| Frontend, primera tanda | 43 | 40 | 2 huecos reales (parpadeo a «anónimo» al iniciar sesión de nuevo con sesión abierta; vista protegida con un token que no se puede leer) y 1 equivalente |
| Validadores del frontend | 30 | 27 | 2 huecos reales (el límite del teléfono se mide sobre el valor recortado; una contraseña de solo espacios es «corta», no «vacía») y 1 equivalente |
| Frontend, tras reestructurar en tres niveles y retirar los tests de formato | 73 (las anteriores, sin las equivalentes) | 73 | Ninguna superviviente: no se perdió capacidad de detección |
| Página de registro (`RegisterPage.tsx`) | 9 | 8 | 1 equivalente: el recorte del email no es observable, porque un `<input type="email">` ya elimina los espacios |
| Backend, proveedores y análisis CSV (API‑042) | 48 | 47 | 1 equivalente: quitar el atajo de «actualización vacía» no cambia nada observable, porque se reescriben los mismos datos y `updated_at` no se mueve |
| Backend, tras consolidar en 6 ficheros | 42 | 40 | Las 2 restantes (cambiar la contraseña exige la actual; no dejar al sistema sin admin) las detectan los tests preexistentes de `test_users.py` |

Los scripts de mutaciones fueron herramientas de un solo uso y **no están en el repositorio**: son una verificación puntual, no reproducible con un comando.

- Encontró por sondeo los 4 bugs de §10 y los 10 casos de §8, y los convirtió en tests (`test_edge_cases.py`, `edgeCases.test.ts`) con un marcador propio, `ai_suggested`, para que se puedan ejecutar y revisar por separado.
- Reestructuró los tests para cumplir los criterios: unificó los nombres, consolidó las 98 funciones de los cinco ficheros `test_auth_*.py` en los seis ficheros actuales (descartando las duplicadas, las que solo probaban formato HTTP y las que probaban la librería JWT en lugar del código propio) y comprobó con la prueba de mutaciones que no se perdía capacidad de detección.

### 9.2 En qué se equivocó la IA (y se corrigió al ejecutar)

- Asumió que toda respuesta 401 trae el mismo mensaje. Sin cabecera `Bearer`, FastAPI responde «Not authenticated».
- Asumió que `EmailStr` rechaza un local-part de 65 caracteres y el formato `<alice@example.com>`. Acepta el primero y normaliza el segundo (que acaba en 409, lo correcto).
- Un test de caducidad usaba un `exp` de 5 minutos y avanzaba 11: el error era del test, no del producto.
- Primera versión del umbral de Jest: el umbral `global` solo se aplica a los ficheros sin umbral propio, así que medía únicamente `api.ts` y fallaba. Se corrigió.
- Primera prueba de que el umbral muerde: quitar `token.test.ts` no baja la cobertura de `token.ts`, que otros tests usan. Se repitió con `errors.ts`.
- En el frontend, la primera versión de cada test pasó a la primera, lo que era sospechoso (algún test podía pasar por vacuidad). Por eso se hizo la prueba de mutaciones, que encontró dos huecos reales.

### 9.3 Qué debe revisar una persona

- **Que los comportamientos fijados son los deseados.** Un test describe lo que el código hace hoy. Se decidió no fijar por no ser requisitos claros: una contraseña de solo espacios (se acepta), tokens que siguen valiendo tras cambiar la contraseña, el local-part de 65 caracteres.
- **Los 7 `xfail` y los 12 `it.failing`**: son la lista de decisiones que esperan a una persona. Ninguno cambia código de producción.
- **Las cuatro correcciones de §10**, hechas por la IA. Conviene revisarlas como cualquier otro cambio, sobre todo el rechazo de caracteres de control en `safeReturnTo`, que es una decisión de diseño (un espacio sí se conserva).
- **La salvedad de §2.3** sobre los tests preexistentes.
- **El ticket AUTH‑088**: nunca se vio. Los criterios de §1 son los que dio la persona que pidió el trabajo.

## 10. Bugs encontrados y corregidos

Los cuatro los encontró la propia batería de pruebas. Cada uno se fijó primero como test que fallaba (`xfail(strict=True)` en pytest, `it.failing` en Jest), se corrigió el código y entonces se convirtió en un test normal. **Verificado después**: al reintroducir cada bug, algún test vuelve a fallar.

| Gravedad | Bug | Corrección | Tests |
|---|---|---|---|
| Media | `POST /users` con un byte `\x00` en la contraseña devolvía **500**: `hash_password` lanzaba un `ValueError` de bcrypt sin capturar. En el login ya se gestionaba | `users/schemas.py`: `_check_password_bytes` rechaza `\x00` con un 422, en el alta y al cambiar la contraseña, sin repetirla | `test_register.py`: caso `nul-byte` de `test_the_password_must_be_8_to_72_bytes_without_nul_bytes` y `test_a_nul_byte_in_a_new_password_is_refused_and_keeps_the_old_one`; `test_cli.py` |
| Baja | `decode_access_token` lanzaba `TypeError` con un token firmado cuyo `exp` es `null` o una lista (daba un 500 en cada ruta protegida; hacía falta la clave de firma) | `auth/security.py`: captura también `TypeError` | `test_token.py`: `test_a_non_numeric_exp_is_a_rejected_token_not_a_crash` |
| Media (nunca se confirmó de extremo a extremo) | **Posible open redirect.** `safeReturnTo("/\t/evil.example")` (y con `\n`, `\r`) devolvía la ruta tal cual; los navegadores eliminan tabuladores y saltos de línea, así que acaba siendo `//evil.example`. No se verificó cómo reacciona `router.replace` de Next | `lib/returnTo.ts`: rechaza cualquier carácter de control. Se conservan los espacios, el texto no ASCII y los caracteres codificados (`%09`) | `returnTo.test.ts`: `must not resolve to another origin` y `refuses control characters anywhere in the path` |
| Baja | `login()` guardaba el texto `"undefined"` como token si la API devolvía un 200 sin `access_token`, y desde entonces lo enviaba como `Bearer undefined` | `lib/api.ts`: un 200 sin `access_token` válido lanza un `ApiError` 502 y no toca la sesión existente | `api.test.ts`: `a 200 with %s is an error and stores no token` y `an invalid 200 does not overwrite an existing session` |

## 11. Fuera de alcance y riesgos conocidos

| Tema | Estado |
|---|---|
| Límite de intentos de login (fuerza bruta) | No existe en el código, así que no hay nada que probar. Conviene valorarlo para producción |
| Invalidar tokens al cambiar la contraseña | Los tokens son sin estado: siguen valiendo hasta caducar. No se fijó como comportamiento esperado |
| `ACCESS_TOKEN_EXPIRE_MINUTES` inválido | El arranque valida `SECRET_KEY` pero no este valor: la app arranca y cada login da 500. Un test garantiza que no se emite ningún token (ver también §8, punto 4) |
| Concurrencia entre procesos | Ver §8, punto 1 |
| Rendimiento y carga | Fuera de alcance |
| Gestor de incidencias (`/api/incidents` CRUD, estados, resumen) | No se ha duplicado en API‑042: `test_incident_manager.py` ya lo cubre al 97-100 % |
| Advertencias de pytest (11) | Todas vienen de código de producción preexistente que usa la constante obsoleta `HTTP_422_UNPROCESSABLE_ENTITY` (`suppliers/router.py:70`, `incidents/router.py:32` y `:34`, `users/router.py:78`) y de una importación de Starlette. No se han tocado |
| El análisis CSV guarda el último resultado en memoria | Documentado en `incidents/service.py`: un reinicio lo pierde y un segundo proceso no lo ve. Los tests lo fijan como comportamiento actual |
| Resto de `api.ts` (incidencias, proveedores) y las páginas | No se prueban aquí, salvo la página de registro (`views/RegisterPage.test.tsx`). El resto sigue cubierto solo por los scripts e2e de Playwright, que no se ejecutaron |
| Vulnerabilidades de dependencias (`npm audit`) | **Ya existían 8 antes de instalar Jest (2 moderadas, 6 altas), todas en dependencias de producción** (`npm audit --omit=dev` da la misma cifra). Instalar Jest añade 19 moderadas, solo de desarrollo, hasta 27. Ninguna se ha investigado ni corregido |
