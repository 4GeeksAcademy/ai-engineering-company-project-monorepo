# Tech Context

**Stack:**
- Monorepo: NPM Workspaces.
- Frontend: Next.js 15 (App Router) + TypeScript + Tailwind CSS.
- Core Logic: Paquete privado `@trackflow/logic` (TypeScript puro).
- Alias: `@trackflow/logic/*` apunta a `packages/logic/src/*`.
- **Backend API**: FastAPI (Python 3.12) en `services/api/`
- **Base de datos**: TinyDB (JSON file-based, `services/api/db.json`)
- **Autenticación**: JWT stateless (Bearer token) via `python-jose[cryptography]`
- **Password Hashing**: `passlib[bcrypt]` + `bcrypt==4.0.1` (pinned, bcrypt 5.x rompe passlib)

**Dependencias Python clave (`services/api/requirements.txt`):**
- `fastapi`, `uvicorn`, `tinydb`, `pydantic[email]`
- `python-jose[cryptography]==3.5.0`
- `passlib[bcrypt]==1.7.4`, `bcrypt==4.0.1`
- `email-validator==2.2.0`

**Estructura del Backend (`services/api/`):**
- `main.py` — App FastAPI con CORS y 4 routers
- `models/` — Package con supplier_models, user_models, profile_models
- `services/` — auth_service.py (JWT), user_service.py (CRUD)
- `dependencies/` — auth_deps.py (get_current_user, get_admin_user)
- `routes/` — auth.py, users.py, profiles.py, suppliers.py
- `.env` — SECRET_KEY, ACCESS_TOKEN_EXPIRE_MINUTES, CORS_ORIGINS

**Reglas de Arquitectura:**
- La lógica de negocio vive exclusivamente en `packages/logic/`.
- La UI (Next.js) es solo una capa de presentación.
- No se permiten importaciones circulares.