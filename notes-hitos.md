# 🎯 Historial de Proyectos — Brasaland

> Notas técnicas de cada hito completado, para mantener contexto y tracción entre entregas.

---

## **`</> Propuesta de Arquitectura de Backend`**

### 🧠 ¿Qué hice?

Redacté el documento **`docs/ARCHITECTURE_PROPOSAL.md`** — la propuesta de arquitectura del backend de Brasaland que el CTO (Nicolás) pidió antes de empezar a programar.

### La decisión central

Elegí un **Monolito Modular con capas por dominio** — ¿qué significa eso?

- **Monolito**: todo el backend es una sola aplicación que se despliega junta. No microservicios.
- **Modular**: el código está organizado en **10 dominios de negocio** (locales, menú, ventas, inventario, compras, clientes, lealtad, RRHH, capacitación, analytics).
- **Capas**: cada dominio se divide en router → service → repository (la estructura clásica de FastAPI).

### ¿Por qué?

| Para Brasaland | Para el equipo |
|---|---|
| 14 locales, 2 países, mucha complejidad real | Equipo pequeño, evitar sobreingeniería |
| Datos en tiempo real (ventas, stock) | FastAPI es async nativo |
| Múltiples frontends (app, web, backoffice) | Una API unificada sirve a todos |

### Lo que incluye el documento

1. **Patrón arquitectónico** y por qué descarté microservicios, serverless, MVC y hexagonal.
2. **Estructura de carpetas** completa (`services/backend/`) siguiendo las convenciones oficiales de FastAPI.
3. **Rutas y endpoints** organizados por dominio con tabla detallada.
4. **Separación frontend/backend** — monorepo compartido, CORS, JWT, variables de entorno.
5. **Decisiones técnicas** — FastAPI, PostgreSQL, SQLAlchemy async, Redis, Docker.
6. **5 riesgos** con mitigaciones concretas (acoplamiento, common/ desordenado, confusión Pydantic vs SQLAlchemy, etc.).

---

*Documento interno — Brasaland Digital*