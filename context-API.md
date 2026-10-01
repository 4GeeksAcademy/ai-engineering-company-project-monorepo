# 🧭 FastAPI — Asegurando la API: Autenticación y Restricción de Rutas

> **Proyecto 4Geeks:** AUTH-01 — Securing the API: Authentication and Route Restriction in FastAPI
> **Cohorte:** Authentication in web applications (1674)
> **Slug:** `ai-eng-user-authentication-api`
> **Tarea ID:** 954916 — `PROJECT`
> **Basado en README oficial:** [EN](./README.md) / [ES](./README.es.md)
>
> ⚠️ **Este documento es la especificación ejecutable para el agente.**
> El agente NO debe tomar decisiones propias. Cada sección es un mandato. Si hay ambigüedad, detenerse y preguntar.

---

## 📋 Índice

1. [Reglas del agente](#1-reglas-del-agente)
2. [Contexto del proyecto](#2-contexto-del-proyecto)
3. [Stack técnico exacto](#3-stack-técnico-exacto)
4. [Estructura de archivos](#4-estructura-de-archivos)
5. [Fase 0 — Preparación del entorno](#5-fase-0--preparación-del-entorno)
6. [Fase 1 — Modelos de datos](#6-fase-1--modelos-de-datos)
7. [Fase 2 — Servicio de autenticación y helpers](#7-fase-2--servicio-de-autenticación-y-helpers)
8. [Fase 3 — Endpoints de usuarios (/users)](#8-fase-3--endpoints-de-usuarios-users)
9. [Fase 4 — Endpoints de perfil (/profiles)](#9-fase-4--endpoints-de-perfil-profiles)
10. [Fase 5 — Endpoints de autenticación (/auth)](#10-fase-5--endpoints-de-autenticación-auth)
11. [Fase 6 — Dependencia get_current_user](#11-fase-6--dependencia-get_current_user)
12. [Fase 7 — Proteger rutas existentes del Supplier Directory](#12-fase-7--proteger-rutas-existentes-del-supplier-directory)
13. [Fase 8 — Integración en main.py](#13-fase-8--integración-en-mainpy)
14. [Fase 9 — Variables de entorno (.env)](#14-fase-9--variables-de-entorno-env)
15. [Fase 10 — Testing manual](#15-fase-10--testing-manual)
16. [Checklist de entrega 4Geeks](#16-checklist-de-entrega-4geeks)
17. [Código completo](#17-código-completo)

---

## 1. Reglas del agente

```
╔══════════════════════════════════════════════════════════════════╗
║  REGLAS ABSOLUTAS PARA EL AGENTE DESARROLLADOR                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  1. NO tomar decisiones propias. Cada sección es un mandato.    ║
║  2. NO cambiar nombres de archivos, funciones, rutas o          ║
║     variables especificadas aquí.                               ║
║  3. NO hardcodear SECRET_KEY ni ACCESS_TOKEN_EXPIRE_MINUTES.    ║
║     Leer desde .env SIEMPRE.                                    ║
║  4. NO usar sessions ni cookies. Solo JWT stateless.            ║
║  5. NO crear tablas User/Profile en SQL/Supabase.               ║
║     Solo TinyDB.                                                ║
║  6. NO almacenar contraseñas en texto plano.                    ║
║     Usar passlib + bcrypt SIEMPRE.                              ║
║  7. NO usar pip install. Usar uv add.                           ║
║  8. SI hay ambigüedad → DETENERSE y reportar.                   ║
║  9. CADA archivo debe tener docstring explicando su propósito.  ║
║ 10. CADA endpoint debe tener docstring en español explicando    ║
║     qué hace, qué recibe, qué devuelve.                         ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 2. Contexto del proyecto

### Situación actual
- La empresa tiene una API FastAPI con endpoints CRUD para **Supplier Directory**.
- Actualmente **no hay autenticación** — cualquiera que conozca una URL puede llamar cualquier endpoint.
- La CTO ordena: ninguna ruta que modifique o exponga datos sensibles sin sesión válida.

### Lo que hay que construir
1. **User model** en TinyDB (solo credenciales: email + password hasheado)
2. **Profile model** en TinyDB (datos de contacto: name, phone, address — vinculado 1:1 a User)
3. **CRUD /users** (protegido excepto POST)
4. **CRUD /profiles** (protegido, solo el owner)
5. **Auth endpoints** /auth/login → JWT + /auth/me
6. **get_current_user dependency** reusable
7. **Proteger 5 rutas existentes** del Supplier Directory

### Reglas de negocio clave

| Regla | Valor |
|-------|-------|
| País → Moneda | Spain → EUR, USA → USD |
| Roles válidos | `admin`, `manager`, `user` |
| Default role | `user` |
| Auth type | JWT stateless (Bearer token) |
| Almacenamiento Users | TinyDB (NUNCA PostgreSQL) |
| Almacenamiento Profiles | TinyDB (NUNCA PostgreSQL) |
| Hashing | passlib + bcrypt |
| Token signing | python-jose[cryptography] |
| Token expiry | Desde `.env` (ACCESS_TOKEN_EXPIRE_MINUTES) |
| Rutas auth | `/auth/*` |
| Rutas users | `/users/*` |
| Rutas profiles | `/profiles/*` |
| Supplier routes | `/suppliers/*` (heredado) |

---

## 3. Stack técnico exacto

### Backend (nuevas dependencias a añadir)

```
# Añadir con uv add (nunca pip install)
python-jose[cryptography]  # Firma y verificación JWT
passlib[bcrypt]            # Hashing de contraseñas con bcrypt
python-dotenv              # Carga de .env (ya debería estar)

# Ya existentes del proyecto anterior
fastapi
uvicorn
tinydb
pydantic
pydantic-settings
python-multipart
```

### Comando exacto

```bash
uv add "python-jose[cryptography]" "passlib[bcrypt]"
```

---

## 4. Estructura de archivos

```
services/api/                          ← Dentro del monorepo (rama feature/auth)
├── main.py                            ← FastAPI app + CORS + TODOS los routers
├── database.py                        ← TinyDB init (tiene suppliers_table)
├── models/
│   ├── __init__.py                    ← (opcional) re-exporta todo
│   ├── supplier_models.py             ← YA EXISTE: SupplierCreate, Supplier, enums
│   ├── user_models.py                 ← NUEVO: User, UserCreate, UserResponse
│   └── profile_models.py              ← NUEVO: Profile, ProfileCreate, ProfileUpdate
├── routes/
│   ├── __init__.py                    ← (opcional)
│   ├── suppliers.py                   ← YA EXISTE: CRUD suppliers
│   ├── users.py                       ← NUEVO: CRUD users
│   ├── profiles.py                    ← NUEVO: CRUD profiles
│   └── auth.py                        ← NUEVO: login, me
├── services/
│   ├── __init__.py                    ← (opcional)
│   ├── auth_service.py                ← NUEVO: hash, verify, create_token, decode_token
│   └── user_service.py                ← NUEVO: CRUD users (funciones, no endpoints)
├── dependencies/
│   ├── __init__.py                    ← (opcional)
│   └── auth_deps.py                   ← NUEVO: get_current_user + get_admin_user
├── seed.py                            ← YA EXISTE: seed de 15 suppliers
├── .env                               ← ACTUALIZAR: añadir SECRET_KEY, ACCESS_TOKEN_EXPIRE_MINUTES
├── requirements.txt                   ← ACTUALIZAR: añadir python-jose, passlib
└── db.json                            ← Autogenerado (ahora con nuevas tablas User y Profile)
```

---

## 5. Fase 0 — Preparación del entorno

### 5.1 Crear rama

```bash
# Dentro del monorepo
git checkout -b feature/auth
```

### 5.2 Instalar dependencias

```bash
uv add "python-jose[cryptography]" "passlib[bcrypt]"
```

### 5.3 Crear estructura de directorios

```bash
mkdir -p services/api/models
mkdir -p services/api/services
mkdir -p services/api/dependencies
touch services/api/models/__init__.py
touch services/api/services/__init__.py
touch services/api/dependencies/__init__.py
```

### 5.4 Verificar archivos existentes

| Archivo | ¿Existe? | Acción |
|---------|:--------:|--------|
| `services/api/main.py` | ✅ | Actualizar: importar nuevos routers |
| `services/api/database.py` | ✅ | Actualizar: añadir `users_table`, `profiles_table` |
| `services/api/models/` | ❌ | Crear con __init__.py |
| `services/api/routes/suppliers.py` | ✅ | MODIFICAR: añadir `Depends(get_current_user)` |
| `services/api/routes/` | ✅ | Añadir users.py, profiles.py, auth.py |
| `services/api/services/` | ❌ | Crear con auth_service.py, user_service.py |
| `services/api/dependencies/` | ❌ | Crear con auth_deps.py |
| `services/api/.env` | ✅ | Añadir SECRET_KEY, ACCESS_TOKEN_EXPIRE_MINUTES |

---

## 6. Fase 1 — Modelos de datos

### 6.1 Actualizar `services/api/database.py`

```python
"""
database.py — Inicialización de TinyDB

Ahora con 3 tablas:
- suppliers_table (YA EXISTE): datos de proveedores TrackFlow
- users_table (NUEVO): credenciales de usuario (email, password hasheado)
- profiles_table (NUEVO): datos de perfil (name, phone, address)
"""

from tinydb import TinyDB, Query

db = TinyDB("db.json")
suppliers_table = db.table("suppliers")
users_table = db.table("users")
profiles_table = db.table("profiles")

# Queries reutilizables
Supplier = Query()
User = Query()       # Uso: User.email == "user@example.com"
Profile = Query()    # Uso: Profile.user_id == user_id
```

### 6.2 Crear `services/api/models/user_models.py`

```python
"""
user_models.py — Modelos Pydantic para User

User almacena SOLO credenciales:
- id: autoincremental (TinyDB doc_id)
- email: único, válido
- hashed_password: bcrypt hash (NUNCA texto plano)
- is_active: bool (default True)
- role: admin | manager | user (Enum)
- created_at: timestamp

NO almacenar name, phone, address aquí. Van en Profile.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserRole(str, Enum):
    """
    Roles válidos para el sistema.
    
    - admin: acceso total, puede cambiar roles
    - manager: gestión operativa
    - user: usuario regular (default para nuevos registros)
    """
    admin = "admin"
    manager = "manager"
    user = "user"


class UserCreate(BaseModel):
    """
    Modelo para POST /users — crear usuario.
    
    Campos:
    - email: obligatorio, validado como email
    - password: obligatorio, mínimo 8 caracteres
    - role: opcional, default 'user' (solo admin puede cambiarlo)
    
    Profile opcional:
    - name, phone, address: si se envían, se crea Profile automáticamente
    """
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: UserRole = Field(default=UserRole.user)
    
    # Campos opcionales para crear Profile en la misma operación
    name: Optional[str] = Field(None)
    phone: Optional[str] = Field(None)
    address: Optional[str] = Field(None)


class UserUpdate(BaseModel):
    """
    Modelo para PUT /users/{id} — actualizar usuario.
    
    Solo el propio usuario o un admin pueden actualizar.
    Solo admin puede cambiar el role.
    """
    email: Optional[EmailStr] = Field(None)
    password: Optional[str] = Field(None, min_length=8)
    role: Optional[UserRole] = Field(None)
    is_active: Optional[bool] = Field(None)


class UserResponse(BaseModel):
    """
    Modelo de respuesta para User.
    NUNCA incluir hashed_password en la respuesta.
    """
    id: int
    email: str
    is_active: bool
    role: UserRole
    created_at: str
```

### 6.3 Crear `services/api/models/profile_models.py`

```python
"""
profile_models.py — Modelos Pydantic para Profile

Profile almacena datos de contacto vinculados 1:1 a User.
- user_id: FK al User en TinyDB
- name: nombre visible
- phone: teléfono de contacto
- address: dirección física

Solo el owner del perfil puede modificarlo.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class ProfileCreate(BaseModel):
    """
    Modelo para crear Profile.
    user_id se asigna automáticamente al crear el User.
    """
    name: str = Field(..., min_length=1)
    phone: Optional[str] = Field(None)
    address: Optional[str] = Field(None)


class ProfileUpdate(BaseModel):
    """
    Modelo para PUT /profiles/me — actualizar perfil.
    Todos los campos son opcionales.
    """
    name: Optional[str] = Field(None, min_length=1)
    phone: Optional[str] = Field(None)
    address: Optional[str] = Field(None)


class ProfileResponse(BaseModel):
    """
    Modelo de respuesta para Profile.
    """
    id: int
    user_id: int
    name: str
    phone: Optional[str]
    address: Optional[str]
```

---

## 7. Fase 2 — Servicio de autenticación y helpers

### 7.1 Crear `services/api/services/auth_service.py`

```python
"""
auth_service.py — Servicios de autenticación

Responsabilidades:
- Hashing de contraseñas con passlib[bcrypt]
- Verificación de contraseña contra hash
- Creación de tokens JWT firmados
- Decodificación y validación de tokens JWT

Configuración desde .env:
- SECRET_KEY: clave de firma (NUNCA hardcodeada)
- ACCESS_TOKEN_EXPIRE_MINUTES: minutos hasta expiración

Importante:
- NUNCA almacenar o comparar contraseñas en texto plano
- El token JWT lleva: sub=user_id, exp=expiry, role=user_role
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

# ─────────────────────────────────────────────────────────────
# Configuración de passlib con bcrypt
# ─────────────────────────────────────────────────────────────
# CryptContext maneja el esquema de hashing.
# bcrypt es el estándar actual para passwords.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hashea una contraseña usando bcrypt.
    
    Args:
        password: Contraseña en texto plano
        
    Returns:
        str: Hash bcrypt de la contraseña
        
    Ejemplo:
        >>> hash_password("MiPassword123")
        '$2b$12$LJ3m...'
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica una contraseña contra su hash.
    
    Args:
        plain_password: Contraseña en texto plano a verificar
        hashed_password: Hash bcrypt almacenado
        
    Returns:
        bool: True si coincide, False si no
        
    NOTA: NUNCA comparar contraseñas en texto plano.
    Siempre usar esta función que compara contra el hash.
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    data: dict,
    secret_key: Optional[str] = None,
    expires_minutes: Optional[int] = None,
) -> str:
    """
    Crea un token JWT firmado.
    
    El token incluye:
    - Los claims del diccionario data (al menos 'sub' con user_id)
    - 'exp': timestamp de expiración
    - 'iat': timestamp de creación (issued at)
    
    Args:
        data: Diccionario con los claims (ej: {"sub": user_id, "role": "user"})
        secret_key: Clave secreta (desde .env). Si None, lee de os.environ.
        expires_minutes: Minutos hasta expiración. Si None, lee de .env.
        
    Returns:
        str: Token JWT firmado
    
    SECURITY: La SECRET_KEY nunca se hardcodea aquí.
    Siempre se lee de entorno.
    """
    if secret_key is None:
        secret_key = os.environ.get(
            "SECRET_KEY",
            "fallback-dev-key-change-in-production"  # ← fallback solo para desarrollo
        )
    
    if expires_minutes is None:
        expires_minutes = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm="HS256")
    return encoded_jwt


def decode_access_token(
    token: str,
    secret_key: Optional[str] = None,
) -> Optional[dict]:
    """
    Decodifica y valida un token JWT.
    
    Args:
        token: Token JWT a decodificar
        secret_key: Clave secreta (desde .env). Si None, lee de os.environ.
        
    Returns:
        dict: Payload decodificado si es válido
        None: Si el token es inválido, expiró o la firma no coincide
    
    SECURITY: Si el token expiró, está malformado o la firma
    es inválida, devuelve None → el caller debe responder 401.
    """
    if secret_key is None:
        secret_key = os.environ.get(
            "SECRET_KEY",
            "fallback-dev-key-change-in-production"
        )
    
    try:
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        return payload
    except JWTError:
        return None
```

### 7.2 Crear `services/api/services/user_service.py`

```python
"""
user_service.py — Servicios CRUD para User y Profile

Todas las operaciones de base de datos para usuarios y perfiles.
NO son endpoints — son funciones llamadas desde los routers.

Funciones:
- create_user(db_data, profile_data) → crea User + Profile
- get_user_by_id(user_id) → User o None
- get_user_by_email(email) → User o None
- get_all_users() → lista de Users
- update_user(user_id, update_data) → User actualizado
- delete_user(user_id) → elimina User + Profile vinculado
- get_profile_by_user_id(user_id) → Profile o None
- update_profile(user_id, profile_data) → Profile actualizado
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from database import profiles_table, users_table, User as UserQuery

from models.user_models import UserCreate, UserUpdate
from services.auth_service import hash_password


def create_user(user_data: UserCreate) -> dict:
    """
    Crea un nuevo usuario en TinyDB.
    
    Flow:
    1. Hashea la contraseña ANTES de guardar
    2. Crea el documento User en users_table
    3. Si hay datos de perfil (name, phone, address), crea Profile vinculado
    
    Args:
        user_data: UserCreate validado por Pydantic
        
    Returns:
        dict: User creado (sin hashed_password)
    """
    user_dict = {
        "email": user_data.email,
        "hashed_password": hash_password(user_data.password),
        "is_active": True,
        "role": user_data.role.value,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    doc_id = users_table.insert(user_dict)
    user_dict["id"] = doc_id
    
    # Si se incluyeron datos de perfil, crear Profile
    if user_data.name:
        profile_dict = {
            "user_id": doc_id,
            "name": user_data.name,
            "phone": user_data.phone or "",
            "address": user_data.address or "",
        }
        profiles_table.insert(profile_dict)
    
    return user_dict


def get_user_by_id(user_id: int) -> Optional[dict]:
    """Obtiene un usuario por su ID. Devuelve None si no existe."""
    user = users_table.get(doc_id=user_id)
    if user:
        user["id"] = user.doc_id
    return user


def get_user_by_email(email: str) -> Optional[dict]:
    """Obtiene un usuario por su email. Devuelve None si no existe."""
    results = users_table.search(UserQuery.email == email)
    if not results:
        return None
    user = results[0]
    user["id"] = user.doc_id
    return user


def get_all_users() -> list[dict]:
    """Devuelve todos los usuarios (sin hashed_password)."""
    users = users_table.all()
    for user in users:
        user["id"] = user.doc_id
    return users


def update_user(user_id: int, update_data: UserUpdate) -> Optional[dict]:
    """
    Actualiza un usuario.
    
    Solo actualiza los campos que no son None en update_data.
    Si password no es None, lo hashea antes de guardar.
    
    Args:
        user_id: ID del usuario a actualizar
        update_data: UserUpdate con campos a modificar
        
    Returns:
        dict: User actualizado o None si no existe
    """
    user = users_table.get(doc_id=user_id)
    if not user:
        return None
    
    update_dict = {}
    if update_data.email is not None:
        update_dict["email"] = update_data.email
    if update_data.password is not None:
        update_dict["hashed_password"] = hash_password(update_data.password)
    if update_data.role is not None:
        update_dict["role"] = update_data.role.value
    if update_data.is_active is not None:
        update_dict["is_active"] = update_data.is_active
    
    if update_dict:
        users_table.update(update_dict, doc_ids=[user_id])
    
    return get_user_by_id(user_id)


def delete_user(user_id: int) -> bool:
    """
    Elimina un usuario y su perfil vinculado.
    
    Args:
        user_id: ID del usuario a eliminar
        
    Returns:
        bool: True si se eliminó, False si no existía
    """
    user = users_table.get(doc_id=user_id)
    if not user:
        return False
    
    # Eliminar perfil vinculado
    profiles = profiles_table.search(UserQuery.user_id == user_id)
    for profile in profiles:
        profiles_table.remove(doc_ids=[profile.doc_id])
    
    # Eliminar usuario
    users_table.remove(doc_ids=[user_id])
    return True


def get_profile_by_user_id(user_id: int) -> Optional[dict]:
    """Obtiene el perfil vinculado a un user_id."""
    results = profiles_table.search(UserQuery.user_id == user_id)
    if not results:
        return None
    profile = results[0]
    profile["id"] = profile.doc_id
    return profile


def update_profile(user_id: int, profile_data) -> Optional[dict]:
    """
    Actualiza el perfil de un usuario.
    Crea el perfil si no existe.
    """
    results = profiles_table.search(UserQuery.user_id == user_id)
    
    update_dict = {}
    if profile_data.name is not None:
        update_dict["name"] = profile_data.name
    if profile_data.phone is not None:
        update_dict["phone"] = profile_data.phone
    if profile_data.address is not None:
        update_dict["address"] = profile_data.address
    
    if results:
        # Actualizar existente
        profile = results[0]
        profiles_table.update(update_dict, doc_ids=[profile.doc_id])
        profile.update(update_dict)
        profile["id"] = profile.doc_id
        return profile
    else:
        # Crear nuevo
        update_dict["user_id"] = user_id
        doc_id = profiles_table.insert(update_dict)
        update_dict["id"] = doc_id
        return update_dict
```

---

## 8. Fase 3 — Endpoints de usuarios (/users)

### 8.1 Crear `services/api/routes/users.py`

```python
"""
routes/users.py — Endpoints CRUD para User

TODOS los endpoints están protegidos EXCEPTO POST /users (registro).

Rutas:
- POST   /users         → Registrar (PÚBLICO)
- GET    /users         → Listar (PROTEGIDO)
- GET    /users/{id}    → Obtener por ID (PROTEGIDO)
- PUT    /users/{id}    → Actualizar (PROTEGIDO — solo owner o admin)
- DELETE /users/{id}    → Eliminar (PROTEGIDO — solo owner o admin)

Protección:
- get_current_user inyecta el usuario autenticado
- 401 si no hay token válido
- 403 si no es owner ni admin (PUT/DELETE)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from dependencies.auth_deps import get_current_user
from models.user_models import UserCreate, UserResponse, UserUpdate
from services.user_service import (
    create_user,
    delete_user,
    get_all_users,
    get_user_by_id,
    update_user,
)

router = APIRouter(prefix="/users", tags=["users"])


# ─────────────────────────────────────────────────────────────
# POST /users — REGISTRO (PÚBLICO)
# ─────────────────────────────────────────────────────────────

@router.post("/", response_model=UserResponse, status_code=200)
def register_user(user_data: UserCreate):
    """
    Registra un nuevo usuario.
    
    Este endpoint es PÚBLICO — cualquiera puede crear una cuenta.
    
    Qué hace:
    1. Valida email y password (Pydantic)
    2. Verifica que el email no exista ya
    3. Hashea la contraseña con bcrypt
    4. Crea el User en TinyDB
    5. Si se incluyeron name/phone/address, crea Profile vinculado
    
    Args:
        user_data: email (obligatorio), password (min 8 chars),
                   name/phone/address (opcional, crea Profile)
    
    Returns:
        UserResponse: id, email, is_active, role, created_at
    
    Errors:
        409: El email ya está registrado
        422: Validación fallida (email inválido, password corta)
    """
    # Verificar email único
    existing = get_user_by_email(user_data.email)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"El email '{user_data.email}' ya está registrado",
        )
    
    user = create_user(user_data)
    return UserResponse(
        id=user["id"],
        email=user["email"],
        is_active=user["is_active"],
        role=user["role"],
        created_at=user["created_at"],
    )


# ─────────────────────────────────────────────────────────────
# GET /users — LISTAR (PROTEGIDO)
# ─────────────────────────────────────────────────────────────

@router.get("/", response_model=list[UserResponse])
def list_users(current_user: dict = Depends(get_current_user)):
    """
    Lista todos los usuarios registrados.
    
    PROTEGIDO: requiere token JWT válido.
    
    Returns:
        list[UserResponse]: Lista de usuarios (sin contraseñas)
    
    Errors:
        401: Token no proporcionado o inválido
    """
    users = get_all_users()
    return [
        UserResponse(
            id=u["id"],
            email=u["email"],
            is_active=u["is_active"],
            role=u["role"],
            created_at=u["created_at"],
        )
        for u in users
    ]


# ─────────────────────────────────────────────────────────────
# GET /users/{user_id} — OBTENER POR ID (PROTEGIDO)
# ─────────────────────────────────────────────────────────────

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, current_user: dict = Depends(get_current_user)):
    """
    Obtiene un usuario por su ID.
    
    PROTEGIDO: requiere token JWT válido.
    
    Args:
        user_id: ID del usuario a buscar
    
    Returns:
        UserResponse: Datos del usuario
    
    Errors:
        401: Token no proporcionado o inválido
        404: Usuario no encontrado
    """
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        is_active=user["is_active"],
        role=user["role"],
        created_at=user["created_at"],
    )


# ─────────────────────────────────────────────────────────────
# PUT /users/{user_id} — ACTUALIZAR (PROTEGIDO — owner o admin)
# ─────────────────────────────────────────────────────────────

@router.put("/{user_id}", response_model=UserResponse)
def update_user_endpoint(
    user_id: int,
    update_data: UserUpdate,
    current_user: dict = Depends(get_current_user),
):
    """
    Actualiza un usuario.
    
    PROTEGIDO: solo el propio usuario o un admin.
    
    Reglas:
    - Cualquier usuario autenticado puede cambiar su propio email/password
    - Solo admin puede cambiar el role de otro usuario
    - 403 si no eres el owner ni admin
    
    Args:
        user_id: ID del usuario a actualizar
        update_data: Campos a actualizar (todos opcionales)
    
    Returns:
        UserResponse: Usuario actualizado
    
    Errors:
        401: Token no válido
        403: No autorizado (no eres el owner ni admin)
        404: Usuario no encontrado
    """
    current_id = current_user["id"]
    if current_id != user_id and current_user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="No tienes permiso para modificar este usuario",
        )
    
    user = update_user(user_id, update_data)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        is_active=user["is_active"],
        role=user["role"],
        created_at=user["created_at"],
    )


# ─────────────────────────────────────────────────────────────
# DELETE /users/{user_id} — ELIMINAR (PROTEGIDO — owner o admin)
# ─────────────────────────────────────────────────────────────

@router.delete("/{user_id}")
def delete_user_endpoint(
    user_id: int,
    current_user: dict = Depends(get_current_user),
):
    """
    Elimina un usuario y su perfil vinculado.
    
    PROTEGIDO: solo el propio usuario o un admin.
    
    Args:
        user_id: ID del usuario a eliminar
    
    Returns:
        dict: Mensaje de confirmación
    
    Errors:
        401: Token no válido
        403: No autorizado
        404: Usuario no encontrado
    """
    current_id = current_user["id"]
    if current_id != user_id and current_user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="No tienes permiso para eliminar este usuario",
        )
    
    deleted = delete_user(user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return {"message": "Usuario y perfil eliminados correctamente"}
```

---

## 9. Fase 4 — Endpoints de perfil (/profiles)

### 9.1 Crear `services/api/routes/profiles.py`

```python
"""
routes/profiles.py — Endpoints CRUD para Profile

TODOS los endpoints están PROTEGIDOS.

Rutas:
- GET  /profiles/me    → Obtener mi perfil (PROTEGIDO)
- PUT  /profiles/me    → Actualizar mi perfil (PROTEGIDO)

Protección:
- get_current_user inyecta el usuario autenticado
- Solo el owner del perfil puede ver/modificar su perfil
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from dependencies.auth_deps import get_current_user
from models.profile_models import ProfileResponse, ProfileUpdate
from services.user_service import get_profile_by_user_id, update_profile

router = APIRouter(prefix="/profiles", tags=["profiles"])


# ─────────────────────────────────────────────────────────────
# GET /profiles/me — OBTENER MI PERFIL (PROTEGIDO)
# ─────────────────────────────────────────────────────────────

@router.get("/me", response_model=ProfileResponse)
def get_my_profile(current_user: dict = Depends(get_current_user)):
    """
    Devuelve el perfil del usuario autenticado.
    
    PROTEGIDO: requiere token JWT válido.
    
    Returns:
        ProfileResponse: id, user_id, name, phone, address
    
    Errors:
        401: Token no válido
        404: Perfil no encontrado (crear perfil vía POST /users con name)
    """
    user_id = current_user["id"]
    profile = get_profile_by_user_id(user_id)
    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Perfil no encontrado. Crea un perfil vía POST /users o PUT /profiles/me",
        )
    
    return ProfileResponse(
        id=profile["id"],
        user_id=profile["user_id"],
        name=profile["name"],
        phone=profile.get("phone"),
        address=profile.get("address"),
    )


# ─────────────────────────────────────────────────────────────
# PUT /profiles/me — ACTUALIZAR MI PERFIL (PROTEGIDO)
# ─────────────────────────────────────────────────────────────

@router.put("/me", response_model=ProfileResponse)
def update_my_profile(
    profile_data: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
):
    """
    Actualiza el perfil del usuario autenticado.
    
    PROTEGIDO: solo el owner puede modificar su perfil.
    
    Args:
        profile_data: name, phone, address (todos opcionales)
    
    Returns:
        ProfileResponse: Perfil actualizado
    """
    user_id = current_user["id"]
    profile = update_profile(user_id, profile_data)
    
    return ProfileResponse(
        id=profile["id"],
        user_id=profile["user_id"],
        name=profile["name"],
        phone=profile.get("phone"),
        address=profile.get("address"),
    )
```

---

## 10. Fase 5 — Endpoints de autenticación (/auth)

### 10.1 Crear `services/api/routes/auth.py`

```python
"""
routes/auth.py — Endpoints de autenticación

Rutas:
- POST /auth/login   → Login (PÚBLICO) — email + password → JWT token
- GET  /auth/me      → Mi info (PROTEGIDO) — email + role + Profile

Flujo login:
1. Recibe email y password
2. Busca usuario por email en TinyDB
3. Verifica password contra hash
4. Si OK → crea y devuelve JWT token
5. Si no → 401

Flujo /auth/me:
1. get_current_user valida el token
2. Recupera Profile vinculado
3. Devuelve email, role + datos de Profile
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from dependencies.auth_deps import get_current_user
from services.auth_service import create_access_token, verify_password
from services.user_service import get_profile_by_user_id, get_user_by_email

router = APIRouter(prefix="/auth", tags=["auth"])


# ─────────────────────────────────────────────────────────────
# Modelos de request/response para login
# ─────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    """Payload para POST /auth/login"""
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Respuesta para POST /auth/login"""
    access_token: str
    token_type: str = "bearer"


class AuthMeResponse(BaseModel):
    """Respuesta para GET /auth/me"""
    email: str
    role: str
    is_active: bool
    profile: Optional[dict] = None


# ─────────────────────────────────────────────────────────────
# POST /auth/login — LOGIN (PÚBLICO)
# ─────────────────────────────────────────────────────────────

@router.post("/login", response_model=LoginResponse)
def login(credentials: LoginRequest):
    """
    Inicia sesión y devuelve un token JWT.
    
    PÚBLICO: cualquiera puede hacer login.
    
    Flow:
    1. Busca usuario por email
    2. Verifica contraseña con bcrypt
    3. Si OK → firma JWT con user_id y role
    4. Si no → 401
    
    Args:
        credentials: email + password
    
    Returns:
        LoginResponse: access_token + token_type
    
    Errors:
        401: Email no encontrado o contraseña incorrecta
    """
    user = get_user_by_email(credentials.email)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Email o contraseña incorrectos",
        )
    
    if not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=401,
            detail="Email o contraseña incorrectos",
        )
    
    token = create_access_token(
        data={"sub": str(user["id"]), "role": user["role"]}
    )
    
    return LoginResponse(access_token=token)


# ─────────────────────────────────────────────────────────────
# GET /auth/me — MI INFORMACIÓN (PROTEGIDO)
# ─────────────────────────────────────────────────────────────

@router.get("/me", response_model=AuthMeResponse)
def get_auth_me(current_user: dict = Depends(get_current_user)):
    """
    Devuelve la información del usuario autenticado.
    
    PROTEGIDO: requiere token JWT válido.
    
    Returns:
        AuthMeResponse: email, role, is_active + profile vinculado
    """
    profile = get_profile_by_user_id(current_user["id"])
    
    return AuthMeResponse(
        email=current_user["email"],
        role=current_user["role"],
        is_active=current_user["is_active"],
        profile={
            "name": profile["name"] if profile else None,
            "phone": profile.get("phone") if profile else None,
            "address": profile.get("address") if profile else None,
        } if profile else None,
    )
```

---

## 11. Fase 6 — Dependencia get_current_user

### 11.1 Crear `services/api/dependencies/auth_deps.py`

```python
"""
dependencies/auth_deps.py — Dependencias de autenticación FastAPI

Dependencias disponibles:
- get_current_user: extrae token del header, valida JWT, devuelve user
- get_admin_user: igual que get_current_user pero verifica role==admin

Cualquier ruta que incluya Depends(get_current_user) queda automáticamente
protegida. Si no hay token válido → 401.

Uso en routers:
    @router.get("/users/")
    def list_users(current_user: dict = Depends(get_current_user)):
        ...
"""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from services.auth_service import decode_access_token
from services.user_service import get_user_by_id

# OAuth2PasswordBearer extrae automáticamente el token del header:
# Authorization: Bearer <token>
# Si no hay token, devuelve 401 automático.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Dependencia principal de autenticación.
    
    Extrae el token del header Authorization, lo decodifica,
    recupera el usuario de TinyDB y lo devuelve.
    
    Args:
        token: JWT extraído automáticamente del header Bearer
    
    Returns:
        dict: Usuario autenticado (con id, email, role, is_active, ...)
    
    Errors:
        401: Token no proporcionado
        401: Token inválido o expirado
        401: Usuario no encontrado en BD
    """
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: no contiene user_id",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = int(user_id_str)
    user = get_user_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Dependencia para rutas que solo admin puede acceder.
    
    Extiende get_current_user y verifica role == 'admin'.
    
    Args:
        current_user: Usuario autenticado (de get_current_user)
    
    Returns:
        dict: Usuario autenticado si es admin
    
    Errors:
        403: El usuario no es admin
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de administrador",
        )
    return current_user
```

---

## 12. Fase 7 — Proteger rutas existentes del Supplier Directory

### 12.1 Modificar `services/api/routes/suppliers.py`

Añadir `Depends(get_current_user)` a **5 endpoints existentes** del supplier directory.

Requisito 4Geeks: al menos 5 rutas existentes FUERA de `/users` y `/auth`.

**Rutas a proteger:**

| Método | Ruta | Descripción |
|:------:|------|-------------|
| `POST` | `/suppliers/` | Crear proveedor |
| `GET` | `/suppliers/` | Listar proveedores |
| `GET` | `/suppliers/{id}` | Detalle |
| `PATCH` | `/suppliers/{id}/rate` | Actualizar tarifa |
| `PATCH` | `/suppliers/{id}/status` | Cambiar estado |
| `DELETE` | `/suppliers/{id}` | Eliminar proveedor |

**Cambio exacto en cada endpoint:**

```python
# ANTES (sin protección):
@router.get("/", response_model=list[Supplier])
def list_suppliers(
    country: Optional[str] = None,
    category: Optional[str] = None,
):
    ...

# DESPUÉS (con protección):
@router.get("/", response_model=list[Supplier])
def list_suppliers(
    country: Optional[str] = None,
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user),  # ← NUEVA LÍNEA
):
    ...
```

**Excepción:** NINGÚN endpoint de suppliers queda público. Todos requieren auth.
Esto es correcto porque son datos sensibles del negocio.

### 12.2 Actualizar import en suppliers.py

```python
# Añadir al inicio del archivo:
from dependencies.auth_deps import get_current_user
```

---

## 13. Fase 8 — Integración en main.py

### 13.1 Modificar `services/api/main.py`

```python
"""
main.py — FastAPI app principal con TODOS los routers

Incluye:
- Suppliers router (YA EXISTE)
- Users router (NUEVO)
- Profiles router (NUEVO)
- Auth router (NUEVO)
- Health check
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ── Importar TODOS los routers ──────────────────────────
from routes.suppliers import router as suppliers_router
from routes.users import router as users_router          # NUEVO
from routes.profiles import router as profiles_router    # NUEVO
from routes.auth import router as auth_router            # NUEVO

app = FastAPI(title="TrackFlow API — Authenticated")

# ── CORS (misma configuración que antes) ────────────────
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Registrar TODOS los routers ─────────────────────────
app.include_router(suppliers_router)      # YA EXISTE (ahora protegido)
app.include_router(users_router)          # NUEVO
app.include_router(profiles_router)       # NUEVO
app.include_router(auth_router)           # NUEVO


@app.get("/health")
def health() -> dict[str, str]:
    """Health check — público. No requiere autenticación."""
    return {"status": "ok"}
```

---

## 14. Fase 9 — Variables de entorno (.env)

### 14.1 Contenido exacto de `.env`

```
# ── TrackFlow API Config ────────────────────────────────
APP_NAME=TrackFlow Suppliers API
CORS_ORIGINS=http://localhost:3000

# ── JWT Authentication (NUEVO) ───────────────────────────
# SECRET_KEY: clave para firmar tokens JWT
# Generar con: openssl rand -hex 32
# ⚠️ CAMBIAR ESTO EN PRODUCCIÓN
SECRET_KEY=09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7

# ACCESS_TOKEN_EXPIRE_MINUTES: minutos hasta expiración
# Default: 30 minutos
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### 14.2 Generar SECRET_KEY segura (opcional)

```bash
# Linux/Mac:
python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

## 15. Fase 10 — Testing manual

### 15.1 Flujo completo de verificación

```bash
# =========================================================
# PASO 1: Iniciar servidor
# =========================================================
cd services/api
uvicorn main:app --reload --port 8000

# Abrir en navegador:
# http://localhost:8000/docs  ← Swagger UI (recomendado para testing manual)

# =========================================================
# PASO 2: Registrar usuario (PÚBLICO — no necesita token)
# =========================================================
curl -X POST http://localhost:8000/users/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@trackflow.com",
    "password": "Segura123",
    "name": "Test User",
    "phone": "+34 600 000 000",
    "address": "Calle Test 123, Madrid"
  }'

# Response esperada: 200 OK con id, email, role, is_active, created_at
# SI DA ERROR: verificar que la BD db.json existe y el servidor está corriendo

# =========================================================
# PASO 3: Login (PÚBLICO)
# =========================================================
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@trackflow.com", "password": "Segura123"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")

echo "Token: $TOKEN"

# Response: access_token + token_type
# SI NO FUNCIONA: revisar SECRET_KEY en .env

# =========================================================
# PASO 4: Ver /auth/me (PROTEGIDO)
# =========================================================
curl -s http://localhost:8000/auth/me \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# Response: email, role, is_active + profile
# SI DA 401: el token no se generó correctamente

# =========================================================
# PASO 5: Ver perfil (PROTEGIDO)
# =========================================================
curl -s http://localhost:8000/profiles/me \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# Response: id, user_id, name, phone, address

# =========================================================
# PASO 6: Listar suppliers (PROTEGIDO — antes era público)
# =========================================================
curl -s http://localhost:8000/suppliers/ \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'{len(d)} proveedores')"

# Response: lista de proveedores
# SI DA 401 → verificar que el token se inyectó correctamente

# =========================================================
# PASO 7: Ruta protegida SIN token → debe dar 401
# =========================================================
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/suppliers/

# Response esperada: 401
# SI DA 200 → la protección NO se aplicó. Revisar Depends() en suppliers.py

# =========================================================
# PASO 8: Ruta protegida con token inválido → debe dar 401
# =========================================================
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/suppliers/ \
  -H "Authorization: Bearer token-invalido"

# Response esperada: 401

# =========================================================
# PASO 9: Crear supplier (PROTEGIDO)
# =========================================================
curl -s -X POST http://localhost:8000/suppliers/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "New Auth Carrier",
    "country": "Spain",
    "categories": ["carrier_last_mile"],
    "rate_per_shipment": 5.0,
    "currency": "EUR",
    "status": "active"
  }' \
  | python3 -m json.tool

# Response: supplier creado

# =========================================================
# PASO 10: Listar usuarios (PROTEGIDO)
# =========================================================
curl -s http://localhost:8000/users/ \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# Response: lista de usuarios (sin contraseñas)
```

### 15.2 Comprobaciones finales

| Test | Comando | Esperado | Resultado |
|:----:|---------|:--------:|:---------:|
| 1 | `POST /users/` sin token | 200 ✅ | PÚBLICO |
| 2 | `POST /users/` email duplicado | 409 | |
| 3 | `POST /auth/login` credenciales correctas | 200 + token | |
| 4 | `POST /auth/login` credenciales incorrectas | 401 | |
| 5 | `GET /auth/me` con token válido | 200 | |
| 6 | `GET /auth/me` sin token | 401 | |
| 7 | `GET /suppliers/` con token válido | 200 | |
| 8 | `GET /suppliers/` sin token | 401 ✅ | PROTEGIDO |
| 9 | `GET /suppliers/` token inválido | 401 | |
| 10 | `POST /suppliers/` con token válido | 200 | |
| 11 | `PUT /users/{id}` otro usuario (no owner) | 403 | |
| 12 | `DELETE /users/{id}` no admin | 403 | |

---

## 16. Checklist de entrega 4Geeks

```
CHECKLIST DE ENTREGA — Proyecto AUTH-01
═══════════════════════════════════════════════════════════════

[ ] 01. User model en TinyDB con: id, email, hashed_password,
         is_active, role, created_at
[ ] 02. Role field: solo admin | manager | user (Enum o validador)
[ ] 03. POST /users crea usuario con role='user' por defecto
[ ] 04. POST /users hash password con bcrypt antes de guardar
[ ] 05. POST /users acepta name/phone/address y crea Profile vinculado
[ ] 06. GET /users — protegido
[ ] 07. GET /users/{id} — protegido
[ ] 08. PUT /users/{id} — protegido, solo owner o admin
[ ] 09. DELETE /users/{id} — protegido, elimina Profile también
[ ] 10. Profile model en TinyDB: id, user_id, name, phone, address
[ ] 11. GET /profiles/me — protegido
[ ] 12. PUT /profiles/me — protegido, solo owner
[ ] 13. POST /auth/login — PÚBLICO, devuelve JWT firmado
[ ] 14. GET /auth/me — protegido, devuelve email + role + Profile
[ ] 15. get_current_user dependency: extrae Bearer, decodifica, 401 si falla
[ ] 16. Token expiry desde .env (ACCESS_TOKEN_EXPIRE_MINUTES)
[ ] 17. SECRET_KEY desde .env (NUNCA hardcodeada)
[ ] 18. 5 rutas de /suppliers protegidas con get_current_user
[ ] 19. 401 para rutas protegidas sin token
[ ] 20. 401 para token expirado o malformado
[ ] 21. 403 para acceso no autorizado (owner check)
[ ] 22. User y Profile SOLO en TinyDB (no PostgreSQL)
[ ] 23. Auth routes bajo /auth
[ ] 24. User routes bajo /users
[ ] 25. Profile routes bajo /profiles
[ ] 26. Rama: feature/auth
[ ] 27. PR contra main con descripción de rutas protegidas
[ ] 28. Sin regresiones — rutas protegidas funcionan con token válido

NOTA: Permisos por rol en cada ruta NO es requerido para entrega.
```

---

## 17. Código completo (resumen de todos los archivos nuevos/modificados)

```
┌────────────────────────────────────────────────────────────────┐
│ NUEVOS archivos a crear:                                        │
├────────────────────────────────────────────────────────────────┤
│ services/api/models/user_models.py        ← User Pydantic      │
│ services/api/models/profile_models.py     ← Profile Pydantic   │
│ services/api/routes/users.py              ← CRUD users         │
│ services/api/routes/profiles.py           ← CRUD profiles      │
│ services/api/routes/auth.py               ← login + /auth/me   │
│ services/api/services/auth_service.py     ← hash + JWT         │
│ services/api/services/user_service.py     ← CRUD functions     │
│ services/api/dependencies/auth_deps.py    ← get_current_user   │
│ services/api/models/__init__.py           ← (opcional) vacío   │
│ services/api/services/__init__.py         ← (opcional) vacío   │
│ services/api/dependencies/__init__.py     ← (opcional) vacío   │
├────────────────────────────────────────────────────────────────┤
│ MODIFICADOS archivos a cambiar:                                │
├────────────────────────────────────────────────────────────────┤
│ services/api/database.py          ← Añadir users_table y      │
│                                      profiles_table            │
│ services/api/routes/suppliers.py  ← Añadir Depends() en 5+    │
│                                      endpoints                 │
│ services/api/main.py              ← Añadir imports de los 3   │
│                                      nuevos routers            │
│ services/api/.env                 ← Añadir SECRET_KEY y        │
│                                      ACCESS_TOKEN_EXPIRE_MINUTES│
│ services/api/requirements.txt     ← Añadir python-jose y      │
│                                      passlib                   │
└────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Orden de ejecución para el agente

```
FASE 0: Preparación
  0.1  git checkout -b feature/auth
  0.2  uv add "python-jose[cryptography]" "passlib[bcrypt]"
  0.3  Crear directorios: models/, services/, dependencies/
  0.4  Crear __init__.py en cada carpeta nueva

FASE 1: Base de datos y modelos
  1.1  ACTUALIZAR database.py (añadir users_table, profiles_table)
  1.2  CREAR models/user_models.py (UserCreate, UserUpdate, UserResponse, UserRole)
  1.3  CREAR models/profile_models.py (ProfileCreate, ProfileUpdate, ProfileResponse)

FASE 2: Servicios
  2.1  CREAR services/auth_service.py (hash, verify, create_token, decode_token)
  2.2  CREAR services/user_service.py (CRUD functions para User y Profile)

FASE 3: Dependencias
  3.1  CREAR dependencies/auth_deps.py (get_current_user, get_admin_user)

FASE 4: Routers NUEVOS
  4.1  CREAR routes/users.py     ← POST público, GET/PUT/DELETE protegidos
  4.2  CREAR routes/profiles.py  ← GET/PUT protegidos (solo owner)
  4.3  CREAR routes/auth.py      ← POST login público, GET /auth/me protegido

FASE 5: Proteger rutas existentes
  5.1  MODIFICAR routes/suppliers.py ← Depends(get_current_user) en 5+ endpoints
  5.2  Verificar que los imports existentes no se rompen

FASE 6: Integración
  6.1  MODIFICAR main.py ← importar los 3 nuevos routers
  6.2  ACTUALIZAR .env ← SECRET_KEY + ACCESS_TOKEN_EXPIRE_MINUTES
  6.3  ACTUALIZAR requirements.txt

FASE 7: Testing
  7.1  uvicorn main:app --reload --port 8000
  7.2  Ejecutar los 12 tests manuales de la Fase 10
  7.3  Verificar que no hay regresiones en /suppliers

FASE 8: Entrega
  8.1  git add .
  8.2  git commit -m "feat: implement JWT authentication + route protection"
  8.3  git push origin feature/auth
  8.4  Crear PR contra main con descripción
```

> ⚡ **El agente debe seguir este orden exacto. No saltar fases. Cada archivo creado debe tener docstring y comentarios explicativos en español.**
