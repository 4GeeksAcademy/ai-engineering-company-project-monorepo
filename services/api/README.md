# services/api

> Python (FastAPI) backend for the AI Engineering monorepo.

## Quick start

```bash
# 1. Create a virtual environment
cd services/api
python3 -m venv .venv
source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the dev server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API docs are available at **http://localhost:8000/docs** (Swagger UI) or **http://localhost:8000/redoc** (ReDoc).

## Project structure

```
services/api/
├── app/
│   ├── __init__.py
│   ├── main.py            # FastAPI application factory
│   ├── core/
│   │   ├── config.py      # Pydantic Settings (env vars)
│   │   └── ...
│   ├── models/
│   │   ├── schemas.py     # Pydantic request/response models
│   │   └── ...
│   ├── routers/
│   │   ├── health.py      # GET /health
│   │   ├── users.py       # Example CRUD endpoints
│   │   └── ...
│   └── services/          # Business logic / domain services
├── tests/
│   └── test_health.py
├── Dockerfile
├── requirements.txt
├── .env.example
└── README.md
```

## Environment variables

Copy `.env.example` to `.env` and adjust values:

| Variable | Default | Description |
|---|---|---|
| `APP_NAME` | AI Engineering API | Application title |
| `APP_VERSION` | 0.1.0 | Semver version |
| `DEBUG` | false | Enable debug mode |
| `SECRET_KEY` | change-me | JWT / signing secret |
| `PASSWORD_RESET_EXPIRE_MINUTES` | 15 | Password reset link lifetime |
| `RESEND_API_KEY` | empty | Resend API key used for password reset emails |
| `RESEND_FROM_EMAIL` | Brasaland <onboarding@resend.dev> | Sender address; use a verified domain in production |
| `BACKOFFICE_URL` | http://localhost:3002 | Public backoffice URL used in reset links |
| `DATABASE_URL` | sqlite+aiosqlite:///./dev.db | Database connection string |
| `CORS_ORIGINS` | ["http://localhost:3000"] | Allowed CORS origins |

## Adding new endpoints

1. Create a new router in `app/routers/`:
   ```python
   from fastapi import APIRouter
   router = APIRouter(prefix="/my-resource", tags=["my-resource"])

   @router.get("/")
   async def list_items():
       return {"items": []}
   ```
2. Register it in `app/main.py`:
   ```python
   from app.routers import my_resource
   application.include_router(my_resource.router, prefix=settings.API_V1_PREFIX)
   ```

## Docker

```bash
docker build -t api-service .
docker run -p 8000:8000 api-service
```

## Testing

```bash
pytest tests/ -v
```
