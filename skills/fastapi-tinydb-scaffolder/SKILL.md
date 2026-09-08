---
name: fastapi-tinydb-scaffolder
description: Guía de arquitectura y reglas estrictas para crear nuevos módulos (modelos, base de datos y rutas) en el proyecto FastAPI con TinyDB.
---

# FastAPI + TinyDB Scaffolder Skill

Esta habilidad proporciona las reglas de arquitectura que debes seguir obligatoriamente cuando el usuario te pida crear una nueva entidad, recurso o módulo (ej. `Products`, `Invoices`, `Tasks`) en este monorepo.

## 1. Reglas de Modelos (Pydantic)
- **Ubicación:** Todos los modelos Pydantic deben ser agregados al archivo central `services/api/models.py`.
- **Estructura:** Siempre debes separar la creación (`<Entity>Create`), la respuesta (`<Entity>Response`), y las bases (`<Entity>Base`).
- **Validación:** Usa restricciones estrictas en los campos usando `Field` de Pydantic (e.g. `min_length`, `gt`).

## 2. Reglas de Base de Datos (TinyDB)
- **Ubicación:** Toda la interacción directa con TinyDB debe residir en `services/api/database.py`.
- **Implementación:**
  - Obtén la instancia de la base de datos usando `get_db()`.
  - Interactúa con una tabla específica para la entidad (ej. `db.table('products')`).
  - Implementa las operaciones CRUD completas como funciones independientes (ej. `create_product_in_db`, `get_all_products_from_db`).
  - No escribas lógica de negocio compleja aquí; esto es solo la capa de persistencia de datos.

## 3. Reglas de Rutas (Endpoints)
- **Ubicación:** Crea un nuevo archivo en `services/api/routes/<nombre_entidad_en_plural>.py` (ej. `services/api/routes/products.py`).
- **APIRouter:** Instancia un `APIRouter` configurando su `prefix` y `tags`. (ej. `router = APIRouter(prefix="/products", tags=["products"])`).
- **Seguridad (OBLIGATORIO):** Todos los endpoints que expongan o modifiquen datos deben estar protegidos usando el token JWT de este proyecto.
  - Debes importar: `from fastapi import Depends` y `from services.api.routes.auth import get_current_user`.
  - Inyecta la dependencia: `current_user: dict = Depends(get_current_user)` en todos los endpoints que no sean explícitamente públicos.

## 4. Registro de Rutas
- **Ubicación:** `services/api/main.py`.
- **Acción:** Asegúrate de importar el nuevo router y registrarlo en la aplicación principal (ej. `app.include_router(products.router)`).

## 5. Gestión de Dependencias
- Usa SIEMPRE `uv add <paquete>` si la nueva entidad requiere instalar alguna dependencia. No uses `pip`.

## 6. Ejecución del Servidor
- Si necesitas probar los cambios, instruye al usuario a correr: `uv run uvicorn main:app --reload`.

> **ADVERTENCIA:** Al agregar código, nunca destruyas o alteres módulos existentes a menos que el usuario lo solicite explícitamente. Las extensiones de `models.py` y `database.py` deben realizarse añadiendo código al final del archivo.
