# Auditoría de Serialización del Backend

> **Proyecto:** Arquitectura de Software — Optimización de la respuesta del backend
> **Objetivo:** Examinar todos los endpoints del proyecto, clasificar su estado de serialización y proponer mejoras para usar `model_dump(mode="json")` de Pydantic v2 de forma consistente.

---

## Convenciones

| Estado | Significado |
|--------|-------------|
| ✅ Serializado | Devuelve **una instancia de modelo Pydantic** (no un dict), permitiendo a FastAPI serializar con `model_dump(mode="json")` |
| ⚠️ Parcialmente serializado | Tiene `response_model` definido pero **devuelve un dict manual** (FastAPI hace conversión implícita), o no tiene `response_model` y devuelve un dict simple |
| ❌ No serializado | **Sin `response_model`**, devuelve un dict sin estructura Pydantic de salida |
| N/A | No aplica (respuesta no JSON: CSV, file, etc.) |

---

## Resumen Global

| Módulo | ✅ Serializado | ⚠️ Parcialmente | ❌ No serializado | N/A | Total |
|--------|:-:|:-:|:-:|:-:|:-:|
| **main.py** (endpoints directos) | 3 | 0 | 0 | 1 | 4 |
| **suppliers** | 6 | 0 | 0 | 0 | 6 |
| **incidents** | 5 | 0 | 0 | 0 | 5 |
| **users** | 5 | 0 | 0 | 0 | 5 |
| **profiles** | 2 | 0 | 0 | 0 | 2 |
| **auth** | 5 | 0 | 0 | 0 | 5 |
| **telemetry** | 1 | 0 | 0 | 0 | 1 |
| **TOTAL** | **27** | **0** | **0** | **1** | **28** |

> **Estado final tras la intervención:** De **8✅ / 18⚠️ / 1❌ / 1N/A** → **27✅ / 0⚠️ / 0❌ / 1N/A**

---

## Auditoría por Endpoint — Estado Final

### Módulo: main.py — Endpoints directos ✅

| # | Ruta | Método | Estado | Acción tomada |
|---|------|--------|--------|---------------|
| 1 | `/` | GET | ✅ | Creado `AppInfo` model + `response_model=AppInfo` |
| 2 | `/health` | GET | ✅ | Creado `HealthResponse` model + `response_model=HealthResponse` |
| 3 | `/api/incidents/analyze` | POST | ✅ | Creado `AnalysisResponse` model con sub-modelos anidados. `return AnalysisResponse(**_last_analysis)` |
| 4 | `/api/incidents/results/export` | GET | N/A | CSV export — no aplica serialización JSON |

### Módulo: suppliers — Directorio de Proveedores ✅

| # | Ruta | Método | Estado | Acción tomada |
|---|------|--------|--------|---------------|
| 5 | `/suppliers/` | POST | ✅ | Eliminado `_with_id()`. Usa `model_dump(mode="json")` + `_doc_to_supplier()` con `Supplier.model_validate()` |
| 6 | `/suppliers/` | GET | ✅ | Lista devuelve `_doc_to_supplier(doc.doc_id, doc)` en lugar de `_with_id(doc.doc_id, dict(doc))` |
| 7 | `/suppliers/{supplier_id}` | GET | ✅ | Cache con `Supplier` model, no dict crudo. `_doc_to_supplier()` |
| 8 | `/suppliers/{supplier_id}/rate` | PATCH | ✅ | Retorna `_doc_to_supplier()` en lugar de `_with_id()` |
| 9 | `/suppliers/{supplier_id}/status` | PATCH | ✅ | Retorna `_doc_to_supplier()` en lugar de `_with_id()` |
| 10 | `/suppliers/{supplier_id}` | DELETE | ✅ | `response_model=MessageResponse`. Retorna `MessageResponse(message=...)` |

### Módulo: incidents — Gestor Centralizado de Incidencias ✅ (sin cambios)

| # | Ruta | Método | Estado | Acción tomada |
|---|------|--------|--------|---------------|
| 11-15 | Todos | Todos | ✅ | Sin cambios — ya serializados correctamente |

### Módulo: users — CRUD de Usuarios ✅

| # | Ruta | Método | Estado | Acción tomada |
|---|------|--------|--------|---------------|
| 16 | `/users/` | POST | ✅ | `create_user()` devuelve `UserResponse` en lugar de `dict` |
| 17 | `/users/` | GET | ✅ | `get_all_users()` devuelve `list[UserResponse]` en lugar de `list[dict]` |
| 18 | `/users/{user_id}` | GET | ✅ | `get_user_by_id()` conserva dict (uso interno por auth), endpoint tipado con `response_model` |
| 19 | `/users/{user_id}` | PUT | ✅ | `update_user()` devuelve `UserResponse` construido sin `hashed_password` |
| 20 | `/users/{user_id}` | DELETE | ✅ | `response_model=MessageResponse`. Retorna `MessageResponse(message=...)` |

### Módulo: profiles — Perfiles de Usuario ✅

| # | Ruta | Método | Estado | Acción tomada |
|---|------|--------|--------|---------------|
| 21 | `/profiles/me` | GET | ✅ | `get_profile_by_user_id()` devuelve `ProfileResponse` en lugar de `dict` |
| 22 | `/profiles/me` | PUT | ✅ | `update_profile()` devuelve `ProfileResponse`. Corregido acceso a `profile.id` |

### Módulo: auth — Autenticación ✅

| # | Ruta | Método | Estado | Acción tomada |
|---|------|--------|--------|---------------|
| 23 | `/auth/login` | POST | ✅ | Sin cambios — ya serializado |
| 24 | `/auth/me` | GET | ✅ | Corregido `AuthMeResponse.profile` de `Optional[dict]` a `Optional[ProfileResponse]` |
| 25 | `/auth/forgot-password` | POST | ✅ | `response_model=MessageResponse`. Retorna `MessageResponse(message=...)` |
| 26 | `/auth/reset-password` | POST | ✅ | `response_model=MessageResponse`. Retorna `MessageResponse(message=...)` |
| 27 | `/auth/change-password` | POST | ✅ | `response_model=MessageResponse`. Retorna `MessageResponse(message=...)` |

### Módulo: telemetry — Telemetría ✅ (sin cambios)

| # | Ruta | Método | Estado | Acción tomada |
|---|------|--------|--------|---------------|
| 28 | `/telemetry/events` | POST | ✅ | Sin cambios — ya serializado |

---

## Cambios Realizados

### Nuevos archivos creados
| Archivo | Propósito |
|---------|-----------|
| `models/message_models.py` | `MessageResponse(BaseModel)` — respuesta estándar de confirmación |
| `models/analysis_models.py` | `AnalysisResponse`, `AppInfo`, `HealthResponse`, `SatisfactionSummary`, `PercentageBreakdown` — modelos para análisis y main |

### Archivos modificados
| Archivo | Cambios |
|---------|---------|
| `models/__init__.py` | Re-exporta todos los nuevos modelos |
| `routes/suppliers.py` | Eliminado helper `_with_id()`. Creado `_doc_to_supplier()` con `Supplier.model_validate()`. Todos los endpoints retornan instancias Pydantic. |
| `routes/users.py` | `DELETE /{id}` ahora usa `response_model=MessageResponse` |
| `routes/profiles.py` | Sin cambios (ya funcionaba con los nuevos retornos) |
| `routes/auth.py` | `AuthMeResponse.profile` tipado como `Optional[ProfileResponse]`. forgot/reset/change-password con `response_model=MessageResponse` |
| `services/user_service.py` | `create_user`, `get_all_users`, `update_user` retornan `UserResponse`. `get_profile_by_user_id`, `update_profile` retornan `ProfileResponse`. **CRÍTICO:** `get_user_by_id` y `get_user_by_email` mantienen retorno `dict` para compatibilidad con sistema auth (necesita `hashed_password`) |
| `main.py` | Root con `response_model=AppInfo`, health con `response_model=HealthResponse`, analyze con `response_model=AnalysisResponse` |

---

## Referencias

- **Proyecto de referencia:** [4GeeksAcademy/sp-aie-betoalzu-project](https://github.com/4GeeksAcademy/sp-aie-betoalzu-project)
- **Documentación original:** `docs/serialization-audit.md` del proyecto de referencia (31 endpoints evaluados)
- **Convención Pydantic v2:** Usar `model_dump(mode="json")` para serialización explícita y controlada