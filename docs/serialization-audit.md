# Auditoría de serialización

**Rama:** `feature/serialization-audit` · **Fecha:** 2026-11-07 · **Estado:** Fase 2 y 3 terminadas. Los 32 endpoints están ✅.

Alcance: toda la API FastAPI de `services/api` (suppliers, incidents, incident manager, auth, users, profiles, inventory, health) y sus consumidores en `uis/backoffice`.

## 1. Método

1. Lectura de cada decorador de ruta, de su `response_model` (o de su ausencia) y de lo que devuelve el handler.
2. Para cada endpoint: quién lo llama y qué campos lee el frontend (`uis/backoffice/src`). Los campos que ninguna pantalla lee y no son necesarios para el cliente se consideran candidatos a quitar.
3. Clasificación: ✅ esquema explícito y adecuado · ⚠️ esquema incompleto, con campos innecesarios o que no coincide con el consumidor · ❌ sin esquema (dict o modelo de dominio por inferencia).

Nota sobre el estado original: nada devolvía un objeto ORM de SQLModel (el inventario ya tenía esquemas independientes) y `hashed_password` ya estaba protegido en usuarios. Los problemas reales eran otros: rutas sin `response_model` explícito, esquemas de respuesta que heredaban del esquema de entrada, y campos internos o innecesarios en las respuestas.

## 2. Rutas de auth (primero, por riesgo)

| Endpoint | Entrada | Antes | Después |
| --- | --- | --- | --- |
| `POST /users` (registro) | `UserCreate` (`extra=forbid`, sin `role`) | ⚠️ `UserPublic`: devolvía `email`, `is_active`, `created_at` | ✅ `UserRegistered`: solo `id` y `role`. El email ya está en la petición; el frontend no lee el cuerpo |
| `POST /auth/login` | formulario OAuth2 | ✅ `Token` | ✅ `Token` (`access_token`, `token_type`) |
| `GET /auth/me` | — | ✅ `Me` | ✅ `Me`: `email`, `role`, `profile`. **Devuelve el email a propósito**: la vista de perfil depende de él |
| `POST /auth/forgot-password` | `ForgotPasswordRequest` (ahora `extra=forbid`) | ✅ `Message` | ✅ `Message`, mensaje genérico, nunca reenvía el email |
| `POST /auth/reset-password` | `ResetPasswordRequest` | ✅ `Message` | ✅ `Message` |
| `POST /auth/change-password` | `ChangePasswordRequest` | ✅ `Message` | ✅ `Message` |

Ninguna respuesta de auth contiene contraseñas, hashes ni tokens de reset. El token de reset solo viaja en el email y en la petición de `reset-password`.

## 3. Resto de la API

| # | Método y ruta | Antes | Cambio | Después |
| --- | --- | --- | --- | --- |
| 1 | `GET /health` | ❌ `dict[str, str]` | `Health` con `status: Literal["ok"]` | ✅ |
| 2 | `GET /users` | ⚠️ `UserPublic` (incluía `created_at`) | `UserListItem`: `id`, `email`, `role`, `is_active` | ✅ |
| 3 | `GET /users/{id}` | ✅ `UserPublic` | `UserPublic` ahora es explícito: lista + `created_at` | ✅ |
| 4 | `PUT /users/{id}` | ✅ `UserPublic` | igual que 3. Entrada `UserUpdate` aparte (`role` solo admin) | ✅ |
| 5 | `DELETE /users/{id}` | ✅ 204, `response_class=Response` | — | ✅ |
| 6 | `GET /profiles/me` | ⚠️ `Profile` exponía `id` y `user_id` (claves internas) | `ProfilePublic`: `name`, `phone`, `address` | ✅ |
| 7 | `PUT /profiles/me` | ⚠️ ídem | `ProfilePublic`. Entrada `ProfileUpdate` aparte | ✅ |
| 8 | `GET /suppliers` | ⚠️ `Supplier` (heredaba de `SupplierCreate`; incluía `contact_email`, que la tabla no muestra) | `SupplierListItem` sin `contact_email` | ✅ |
| 9 | `POST /suppliers` | ⚠️ `Supplier` heredado del esquema de entrada | `SupplierDetail` (fila + `contact_email`) | ✅ |
| 10 | `GET /suppliers/{id}` | ⚠️ ídem | `SupplierDetail` | ✅ |
| 11 | `PATCH /suppliers/{id}/rate` | ⚠️ ídem | `SupplierDetail` | ✅ |
| 12 | `PATCH /suppliers/{id}/status` | ⚠️ ídem | `SupplierDetail` | ✅ |
| 13 | `DELETE /suppliers/{id}` | ✅ 204, `response_class=Response` | — | ✅ |
| 14 | `POST /api/incidents/analyze` | ❌ `dict` | `AnalysisResponse` (métricas + `labels`) | ✅ |
| 15 | `GET /api/incidents/results/export` | ❌ sin declaración | `response_class=StreamingResponse` y `text/csv` documentado: es un fichero, no JSON | ✅ |
| 16 | `POST /api/incidents` | ❌ solo anotación de retorno (`Incident`, modelo de dominio) | `IncidentDetail` | ✅ |
| 17 | `GET /api/incidents` | ❌ ídem; devolvía `source_id` y `updated_at` que la lista no lee | `IncidentListItem` | ✅ |
| 18 | `GET /api/incidents/summary` | ❌ solo anotación | `response_model=IncidentSummary` explícito | ✅ |
| 19 | `GET /api/incidents/{id}` | ❌ solo anotación | `IncidentDetail` | ✅ |
| 20 | `PATCH /api/incidents/{id}/status` | ❌ solo anotación | `IncidentDetail` | ✅ |
| 21 | `GET /inventory/products` | ✅ `AssetResponse` | — | ✅ |
| 22 | `POST /inventory/products` | ⚠️ entrada `AssetCreate` aceptaba campos extra y los ignoraba | `AssetCreate` con `extra=forbid` (un `current_stock` enviado da 422) | ✅ |
| 23 | `GET /inventory/products/{id}` | ✅ `AssetResponse` | — | ✅ |
| 24 | `POST /inventory/orders/inbound` | ⚠️ anidaba `asset` completo (5 campos) y la entrada aceptaba extras (p. ej. `user_uuid`) | `AssetEntryResponse` aplanada; `AssetEntryCreate` con `extra=forbid` | ✅ |
| 25 | `POST /inventory/orders/outbound` | ⚠️ ídem | `AssetExitResponse` aplanada; `AssetExitCreate` con `extra=forbid` | ✅ |
| 26 | `GET /inventory/orders` | ⚠️ `asset` anidado en cada fila | `asset_id`, `asset_name`, `asset_sku` | ✅ |

Total: 6 endpoints de la sección 2 + 26 de esta tabla = 32.

## 4. Decisiones sobre relaciones

| Relación | Decisión | Motivo |
| --- | --- | --- |
| Pedido → activo (inventario) | **Proyección plana** `asset_id`, `asset_name`, `asset_sku` | La tabla de pedidos y los avisos solo muestran nombre y SKU. Se quitan `category` y `office` del activo (la oficina ya va en el pedido). El frontend se actualizó en 3 páginas |
| Pedido → usuario | **Solo el ID** (`user_uuid`) | La tabla lo muestra. No hay objeto de usuario que anidar y no se expone el email de otro usuario |
| Perfil → usuario | **Se quita el ID de usuario** | `/profiles/me` siempre es del propio llamante; `id` y `user_id` son claves internas que nadie lee |
| `/auth/me` → perfil | **Objeto anidado `profile`** (3 campos) | Una sola llamada pinta la vista de perfil; es pequeño |
| Proveedor: lista vs. detalle | **Dos esquemas**: la lista sin `contact_email` | Dato de contacto confidencial que la tabla no usa. Las respuestas de creación y cambios (detalle) sí lo devuelven |
| Incidencia: lista vs. detalle | **Dos esquemas**: la lista sin `updated_at`; ninguno con `source_id` | `source_id` es la clave del CSV de seed (interna). `updated_at` solo viaja en el detalle |
| Etiquetas del análisis CSV | Se mantienen en la respuesta | La pantalla las usa para pintar reglas y problemas |

## 5. Cambios de contrato (todos aplicados también en el frontend)

- `POST /users`: `{id, role}` en vez de usuario completo. El frontend ignoraba el cuerpo.
- `GET /users`: sin `created_at`.
- `/profiles/me`: sin `id` ni `user_id`. Tipo TS `Profile` = `ProfileFields`.
- `GET /suppliers`: sin `contact_email`. Tipo TS `Supplier.contact_email` ahora es opcional.
- `/api/incidents`: sin `source_id`; la lista sin `updated_at`. Tipo TS `Incident` actualizado.
- `/inventory/orders*`: `asset` anidado → `asset_id`, `asset_name`, `asset_sku`.
- Entradas de inventario y `forgot-password`: campos desconocidos dan 422 en vez de ignorarse.

## 6. Hallazgos que no se han tocado

- `GET /users` y `GET /users/{id}` los puede llamar **cualquier usuario autenticado** y devuelven el email de todas las cuentas. Es un tema de autorización, no de serialización, y cambiarlo rompe el contrato de acceso. Recomendación: restringirlo a `admin`/`manager` en una tarea aparte.
- `POST /inventory/products` no exige rol. Misma recomendación.

## 7. Protección frente a regresiones

`services/api/tests/test_serialization_contract.py`:

- Falla si algún decorador de ruta (incluido `/health`) no declara `response_model` ni `response_class`.
- Falla si algún esquema de respuesta (también anidado) contiene `hashed_password`, `password`, `token`, `jti`, `source_id` o `user_id`.
- Falla si el esquema de respuesta de `POST /users`, `login`, `forgot-password` o `reset-password` contiene `email`.

Los tests existentes que fijaban las formas antiguas se actualizaron (`test_users`, `test_profiles`, `test_incident_manager`, `test_inventory`).

## 8. Verificación

- Backend: `uv run pytest` → **321 passed** (317 antes + 3 tests nuevos del contrato + 1 de detalle de usuario; los que fijaban formas antiguas se reescribieron, no se borraron).
- Frontend: `npx tsc --noEmit` sin errores y `npx jest` → 70 passed.
- Pruebas manuales contra un servidor `uvicorn` real: `POST /users` → `{"id","role"}`; `GET /auth/me`, `GET /profiles/me` (solo 3 campos), `GET /suppliers` (sin `contact_email`), `GET /api/incidents` (sin `source_id` ni `updated_at`), `/health`. La cuenta de prueba creada para esto se borró con `DELETE /users/{id}` (204) y no quedó nada en la base de datos.
- No se pudo probar `/inventory/*` en vivo porque necesita la base Supabase; queda cubierto por `tests/test_inventory.py`.

## 9. Estado final

Todos los endpoints: ✅. Ninguno devuelve un objeto ORM ni un `dict` sin tipar.
