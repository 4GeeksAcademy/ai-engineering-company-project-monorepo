from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI

from services.api import database
from services.api.auth.security import get_current_user
from services.api.routes.auth import router as auth_router
from services.api.routes.users import router as users_router
from services.api.routes.profiles import router as profiles_router
from services.api.routes.suppliers import router as suppliers_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    database.close_db()


app = FastAPI(
    title="Brasaland Suppliers API",
    lifespan=lifespan,
)

# Autenticacion y usuarios
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(profiles_router)

# Proveedores protegidos con JWT
app.include_router(
    suppliers_router,
    prefix="/suppliers",
    dependencies=[Depends(get_current_user)],
)

# Rutas compatibles con el frontend
app.include_router(
    suppliers_router,
    prefix="/api/suppliers",
    dependencies=[Depends(get_current_user)],
    include_in_schema=False,
)


@app.get("/")
def root():
    return {
        "message": "Brasaland Suppliers API",
        "suppliers": "/suppliers",
        "docs": "/docs",
    }
