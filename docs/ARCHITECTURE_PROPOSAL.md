# Propuesta de Arquitectura — Brasaland Monorepo

## 1. Resumen Ejecutivo

Este documento presenta la propuesta de arquitectura para el monorepo de Brasaland, una cadena de restaurantes de comida a la parrilla con presencia en Colombia y Estados Unidos. La arquitectura está diseñada para soportar la transformación digital de la empresa, incluyendo sitio web corporativo, sistema de fidelización (Brasa Points), backoffice operativo, y herramientas de inteligencia artificial.

**Objetivos clave:**
- Escalabilidad horizontal para múltiples aplicaciones y servicios
- Reutilización de componentes y lógica de negocio
- Separación clara de responsabilidades
- Soporte para IA y automatización
- Facilidad de mantenimiento y despliegue

---

## 2. Visión General del Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MONOREPO BRASALAND                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   uis/       │  │  services/   │  │   agents/    │              │
│  │              │  │              │  │              │              │
│  │ • brasaland- │  │ • API        │  │ • Chatbots   │              │
│  │   web        │  │   Central    │  │ • Asistentes │              │
│  │ • backoffice │  │ • Workers    │  │ • Analítica  │              │
│  │ • talent-    │  │ • Webhooks   │  │              │              │
│  │   pipeline   │  │              │  │              │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   data/      │  │ workflows/   │  │  packages/   │              │
│  │              │  │              │  │              │              │
│  │ • Datasets   │  │ • n8n        │  │ • shared     │              │
│  │ • Pipelines  │  │ • Cron jobs  │  │   types      │              │
│  │ • Evaluación │  │ • Orquest.   │  │ • utils      │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Estructura del Monorepo

### 3.1 Organización por Capas

| Capa | Directorio | Responsabilidad | Tecnologías |
|------|-----------|-----------------|-------------|
| **Presentación** | `uis/` | Interfaces de usuario | Next.js, React, Tailwind CSS |
| **API** | `services/` | Lógica de negocio centralizada | FastAPI, Python |
| **IA** | `agents/`, `skills/`, `mcps/` | Agentes y herramientas inteligentes | Python, LLMs |
| **Datos** | `data/` | Almacenamiento y procesamiento | CSV, JSON, SQLite |
| **Automatización** | `workflows/` | Flujos de trabajo y orquestación | n8n, Cron |
| **Reutilización** | `packages/`, `shared/` | Código compartido | TypeScript, Python |
| **Infraestructura** | `infra/`, `scripts/` | Despliegue y operaciones | Docker, Shell |
| **Documentación** | `docs/`, `memory-bank/` | Conocimiento del proyecto | Markdown |

### 3.2 Dependencias entre Capas

```
┌─────────────────────────────────────────────────┐
│                  uis/ (Frontends)                │
│         Next.js Apps • React Components          │
└─────────────────────┬───────────────────────────┘
                      │ HTTP/REST
                      ▼
┌─────────────────────────────────────────────────┐
│              services/ (API Central)             │
│            FastAPI • Python • REST                │
└─────────────────────┬───────────────────────────┘
                      │ SQL/ORM
                      ▼
┌─────────────────────────────────────────────────┐
│                data/ (Almacenamiento)            │
│         Databases • Files • Pipelines            │
└─────────────────────────────────────────────────┘
                      ▲
                      │ Events/Webhooks
┌─────────────────────────────────────────────────┐
│           agents/ & workflows/ (IA/Auto)         │
│        LLM Agents • n8n • Scheduled Jobs         │
└─────────────────────────────────────────────────┘
```

---

## 4. Capa de Presentación (`uis/`)

### 4.1 Aplicaciones Frontend

#### 4.1.1 Brasaland Web (`uis/brasaland-web/`)
- **Propósito:** Sitio web corporativo público
- **Tecnología:** Next.js 15 + React 19 + Tailwind CSS 4
- **Características:**
  - Server Components por defecto
  - Client Components solo cuando sea necesario
  - SEO optimizado con metadata dinámica
  - Responsive design mobile-first
  - Accesibilidad WCAG 2.1 AA

**Secciones principales:**
1. Header con navegación y selector de idioma
2. Hero con CTA principal
3. Nuestra Historia
4. ¿Qué nos hace únicos?
5. Ubicaciones (Colombia + USA)
6. Brasa Points (programa de fidelización)
7. Formulario de registro
8. Contacto
9. Footer

#### 4.1.2 Backoffice (`uis/backoffice/`)
- **Propósito:** Panel de administración interno
- **Usuarios:** Equipo operativo y gerencia
- **Funcionalidades:**
  - Gestión de miembros Brasa Points
  - Reportes de ventas y métricas
  - Gestión de ubicaciones y menús
  - Auditoría y logs

#### 4.1.3 Talent Pipeline Tracker (`uis/talent-pipeline-tracker/`)
- **Propósito:** Seguimiento de candidatos y reclutamiento
- **Usuarios:** Equipo de RRHH

### 4.2 Componentes Compartidos

Estructura de componentes:
```
components/
├── Button/
│   ├── Button.tsx          # Implementación
│   ├── Button.test.tsx     # Tests
│   ├── Button.module.css   # Estilos (si aplica)
│   └── index.ts            # Export público
├── Card/
├── Header/
├── Footer/
├── RegistrationForm/
│   ├── RegistrationForm.tsx
│   ├── steps/
│   │   ├── Step1PersonalInfo.tsx
│   │   └── Step2Preferences.tsx
│   ├── hooks/
│   │   └── useFormValidation.ts
│   └── index.ts
└── ... (otros componentes)
```

**Convenciones:**
- Un componente por directorio
- Export a través de `index.ts`
- Server Components por defecto
- `"use client"` solo cuando se necesita interactividad

### 4.3 Estado y Gestión de Datos

```
┌─────────────────────────────────────────────────┐
│           Flujo de Datos del Formulario          │
├─────────────────────────────────────────────────┤
│                                                  │
│  User Input → useState → Validación → API       │
│                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │  Step 1  │───▶│  Step 2  │───▶│  Submit  │   │
│  │ Personal │    │ Prefs    │    │  POST    │   │
│  └──────────┘    └──────────┘    └──────────┘   │
│       │              │              │            │
│       ▼              ▼              ▼            │
│  validateStep1  validateStep2  handleSubmit     │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 5. Capa de Servicios (`services/`)

### 5.1 Arquitectura de API Central

```python
# Estructura del servicio FastAPI
services/
├── api/
│   ├── main.py                 # Entry point FastAPI
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── locations.py        # /locations/*
│   │   ├── members.py          # /members/* (Brasa Points)
│   │   ├── menus.py            # /menus/*
│   │   ├── auth.py             # /auth/*
│   │   └── reports.py          # /reports/*
│   ├── models/
│   │   ├── __init__.py
│   │   ├── member.py           # Modelo de miembro
│   │   ├── location.py         # Modelo de ubicación
│   │   └── transaction.py      # Modelo de transacción
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── member.py           # Pydantic schemas
│   │   └── responses.py        # Respuestas estándar
│   ├── services/
│   │   ├── __init__.py
│   │   ├── member_service.py   # Lógica de negocio
│   │   └── points_service.py   # Lógica de puntos
│   ├── database/
│   │   ├── __init__.py
│   │   ├── connection.py       # Conexión a DB
│   │   └── migrations/         # Migraciones
│   └── config.py               # Configuración
├── workers/
│   └── email_worker.py         # Worker para emails
├── requirements.txt
└── Dockerfile
```

### 5.2 Endpoints Principales

```
POST   /api/v1/members              # Registro de miembros
GET    /api/v1/members/{id}         # Obtener miembro
PUT    /api/v1/members/{id}         # Actualizar miembro
GET    /api/v1/members/{id}/points  # Historial de puntos

GET    /api/v1/locations            # Listar ubicaciones
GET    /api/v1/locations/{id}       # Detalle de ubicación
GET    /api/v1/locations/{id}/menu  # Menú de ubicación

POST   /api/v1/transactions         # Registrar transacción
POST   /api/v1/transactions/{id}/points  # Canjear puntos

GET    /api/v1/reports/dashboard    # Métricas dashboard
GET    /api/v1/reports/members      # Reporte de miembros
```

### 5.3 Organización de Routers y Endpoints en FastAPI

#### 5.3.1 Convenciones de Naming

| Recurso | Singular | Plural | Ejemplo |
|---------|----------|--------|---------|
| Colección | - | `/recursos` | `/members`, `/locations` |
| Item individual | `{id}` | - | `/members/{member_id}` |
| Sub-recurso | - | `/recursos/{id}/sub` | `/members/{id}/points` |
| Acciones | - | `/acciones` | `/transactions`, `/reports` |

**Reglas de naming:**
- Siempre en **minúsculas** y **kebab-case** para URLs compuestas
- **Plural** para colecciones: `/members` (no `/member`)
- **Singular** para sub-recursos: `/members/{id}/points` (no `/points/{id}`)
- Verbos en **ingés** y **presente**: `/reports/dashboard` (no `/getDashboard`)

#### 5.3.2 Estructura de un Router

```python
# services/api/routers/members.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.member import MemberCreate, MemberResponse, MemberUpdate
from ..services.member_service import MemberService

router = APIRouter(
    prefix="/members",
    tags=["members"],
    responses={404: {"description": "Member not found"}},
)

@router.post(
    "/",
    response_model=MemberResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new member",
    description="Register a new member in the Brasa Points program",
)
async def create_member(
    member: MemberCreate,
    db: Session = Depends(get_db),
) -> MemberResponse:
    """
    Register a new member in the Brasa Points program.
    
    - **full_name**: First and last name (min 2 words)
    - **email**: Valid email format
    - **phone**: Must include country code (+57 or +1)
    - **country**: Colombia or United States
    - **city**: Must be valid for selected country
    """
    service = MemberService(db)
    return service.create_member(member)

@router.get(
    "/{member_id}",
    response_model=MemberResponse,
    summary="Get member by ID",
    description="Retrieve member details by their unique ID",
)
async def get_member(
    member_id: str,
    db: Session = Depends(get_db),
) -> MemberResponse:
    """Get a specific member by their ID."""
    service = MemberService(db)
    member = service.get_member(member_id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Member with id {member_id} not found"
        )
    return member

@router.get(
    "/{member_id}/points",
    response_model=list,
    summary="Get member points history",
    description="Retrieve the points transaction history for a member",
)
async def get_member_points(
    member_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
) -> list:
    """Get points history with pagination."""
    service = MemberService(db)
    return service.get_member_points(member_id, skip=skip, limit=limit)
```

#### 5.3.3 Patrones de Endpoints

**CRUD Básico:**
```python
# Crear recurso
@router.post("/", response_model=ResourceResponse, status_code=201)

# Listar recursos (con paginación)
@router.get("/", response_model=list[ResourceResponse])

# Obtener recurso específico
@router.get("/{resource_id}", response_model=ResourceResponse)

# Actualizar recurso (parcial o completo)
@router.put("/{resource_id}", response_model=ResourceResponse)
@router.patch("/{resource_id}", response_model=ResourceResponse)

# Eliminar recurso
@router.delete("/{resource_id}", status_code=204)
```

**Sub-recursos:**
```python
# Sub-recurso de un recurso padre
@router.get("/{parent_id}/children", response_model=list[ChildResponse])
@router.post("/{parent_id}/children", response_model=ChildResponse, status_code=201)

# Acciones específicas en un recurso
@router.post("/{member_id}/points/redeem", response_model=PointsResponse)
@router.post("/{member_id}/points/earn", response_model=PointsResponse)
```

**Endpoints de acción (no CRUD):**
```python
# Usar POST para acciones que no son CRUD puro
@router.post("/reports/generate", response_model=ReportResponse)
@router.post("/transactions/validate", response_model=ValidationResponse)

# Usar GET para acciones de solo lectura
@router.get("/reports/dashboard", response_model=DashboardResponse)
@router.get("/reports/members", response_model=MemberReportResponse)
```

#### 5.3.4 Manejo de Errores

```python
from fastapi import HTTPException, status

class MemberNotFoundError(HTTPException):
    def __init__(self, member_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Member with id {member_id} not found"
        )

class DuplicateEmailError(HTTPException):
    def __init__(self, email: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email {email} is already registered"
        )

class InvalidPointsError(HTTPException):
    def __init__(self, requested: int, available: int):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot redeem {requested} points. Available: {available}"
        )
```

#### 5.3.5 Validación y Schemas

```python
# services/api/schemas/member.py

from pydantic import BaseModel, Field, EmailStr, validator
from datetime import date
from typing import Optional

class MemberCreate(BaseModel):
    """Schema for creating a new member."""
    full_name: str = Field(
        ..., 
        min_length=2,
        description="Full name with at least first and last name",
        examples=["Juan Pérez García"]
    )
    email: EmailStr = Field(
        ...,
        description="Valid email address",
        examples=["juan@example.com"]
    )
    phone: str = Field(
        ...,
        pattern=r"^\+(57|1)\s[0-9][0-9\s-]{6,}$",
        description="Phone with country code (+57 or +1)",
        examples=["+57 300 123 4567"]
    )
    country: str = Field(
        ...,
        pattern=r"^(Colombia|United States)$",
        description="Country: Colombia or United States"
    )
    city: str = Field(
        ...,
        description="City must be valid for selected country"
    )
    date_of_birth: date = Field(
        ...,
        description="Must be 18 years or older"
    )
    terms_accepted: bool = Field(
        ...,
        description="Must accept program terms"
    )
    
    @validator("full_name")
    def validate_full_name(cls, v):
        words = v.strip().split()
        if len(words) < 2:
            raise ValueError("Must include first and last name")
        return v
    
    @validator("date_of_birth")
    def validate_age(cls, v):
        from datetime import date
        today = date.today()
        age = today.year - v.year - (
            (today.month, today.day) < (v.month, v.day)
        )
        if age < 18:
            raise ValueError("Must be 18 years or older")
        return v

class MemberResponse(BaseModel):
    """Schema for member response."""
    id: str
    full_name: str
    email: str
    country: str
    city: str
    points_balance: int
    created_at: str
    
    class Config:
        orm_mode = True

class MemberUpdate(BaseModel):
    """Schema for updating member (all fields optional)."""
    full_name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    favorite_location_id: Optional[str] = None
```

#### 5.3.6 Paginación y Filtros

```python
# Convenciones de paginación
from pydantic import BaseModel
from typing import Generic, TypeVar, List

T = TypeVar("T")

class PaginationParams:
    """Standard pagination parameters."""
    def __init__(
        self, 
        skip: int = 0, 
        limit: int = 100,
        max_limit: int = 500
    ):
        self.skip = max(0, skip)
        self.limit = min(limit, max_limit)

class PaginatedResponse(BaseModel, Generic[T]):
    """Standard paginated response."""
    items: List[T]
    total: int
    skip: int
    limit: int
    has_more: bool

# Uso en endpoints
@router.get("/", response_model=PaginatedResponse[MemberResponse])
async def list_members(
    skip: int = 0,
    limit: int = 100,
    country: str = None,
    city: str = None,
    db: Session = Depends(get_db),
):
    """
    List members with pagination and optional filters.
    
    Query params:
    - skip: Number of items to skip (default: 0)
    - limit: Maximum items to return (default: 100, max: 500)
    - country: Filter by country
    - city: Filter by city
    """
    pagination = PaginationParams(skip, limit)
    service = MemberService(db)
    return service.list_members(
        skip=pagination.skip,
        limit=pagination.limit,
        country=country,
        city=city
    )
```

#### 5.3.7 Dependencias y Middleware

```python
# services/api/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import members, locations, transactions, reports
from .database import engine, Base

app = FastAPI(
    title="Brasaland API",
    description="Central API for Brasaland restaurant chain",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://brasaland.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with versioned prefix
app.include_router(members.router, prefix="/api/v1")
app.include_router(locations.router, prefix="/api/v1")
app.include_router(transactions.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")

@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "healthy", "version": "1.0.0"}
```

#### 5.3.8 Puntos de Atención y Riesgos

| Punto de Atención | Riesgo | Mitigación |
|-------------------|--------|------------|
| **Versionado de API** | Breaking changes rompen clientes existentes | Usar prefijo `/api/v1/` y mantener versiones anteriores |
| **Autenticación** | Endpoints expuestos sin auth | Implementar JWT para endpoints protegidos desde el inicio |
| **Rate Limiting** | Ataques DDoS o abuso | Usar `slowapi` o Redis para limitar requests por IP |
| **Validación de IDs** | Inyección SQL o IDs inválidos | Validar formato UUID, usar parámetros tipados |
| **Paginación** | Sobrecarga de memoria con queries grandes | Limitar `max_limit` y usar OFFSET/LIMIT en queries |
| **Errores Genéricos** | Información sensible en mensajes de error | Custom exceptions, logging seguro, mensajes genéricos en producción |
| **Documentación** | API difícil de usar para otros equipos | Mantener `summary` y `description` actualizados |
| **CORS** | Problemas de seguridad cross-origin | Configurar `allow_origins` específicamente, no usar `*` en producción |
| **Idempotencia** | Duplicación de registros en reintentos | Usar idempotency keys en endpoints de creación |
| **Logging** | Dificultad para debuggear en producción | Log requests/responses sensibles, usar request_id |

#### 5.3.9 Checklist de Implementación

- [ ] Definir versionado de API (`/api/v1/`)
- [ ] Implementar health check endpoint
- [ ] Configurar CORS correctamente
- [ ] Crear schemas Pydantic para cada recurso
- [ ] Implementar validación de entrada en todos los endpoints
- [ ] Agregar paginación a endpoints de listado
- [ ] Crear custom exceptions para errores de negocio
- [ ] Implementar logging estructurado
- [ ] Agregar rate limiting
- [ ] Documentar endpoints con OpenAPI
- [ ] Escribir tests para cada endpoint
- [ ] Configurar autenticación para endpoints protegidos

---

### 5.4 Modelo de Datos

```sql
-- Tabla de miembros Brasa Points
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) NOT NULL,
    country VARCHAR(50) NOT NULL,
    city VARCHAR(100) NOT NULL,
    favorite_location_id UUID REFERENCES locations(id),
    dietary_preferences JSONB,
    how_found VARCHAR(100),
    date_of_birth DATE NOT NULL,
    terms_accepted BOOLEAN NOT NULL,
    offers_opt_in BOOLEAN DEFAULT FALSE,
    points_balance INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de ubicaciones
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    country VARCHAR(50) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    hours JSONB,
    is_active BOOLEAN DEFAULT TRUE
);

-- Tabla de transacciones
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members(id),
    location_id UUID REFERENCES locations(id),
    amount DECIMAL(10,2) NOT NULL,
    points_earned INTEGER NOT NULL,
    transaction_date TIMESTAMP DEFAULT NOW()
);
```

---

## 6. Capa de Inteligencia Artificial (`agents/`)

### 6.1 Agentes Disponibles

```
agents/
├── README.md
├── _template/
│   ├── agent.py              # Template para nuevos agentes
│   ├── README.md
│   └── tests/
├── customer_service/
│   ├── agent.py              # Agente de atención al cliente
│   ├── prompts/              # Prompts del agente
│   └── tests/
├── menu_recommender/
│   ├── agent.py              # Recomendador de menú
│   └── tests/
└── analytics/
    ├── agent.py              # Análisis de datos
    └── tests/
```

### 6.2 Capacidades de Agentes

| Agente | Propósito | Input | Output |
|--------|-----------|-------|--------|
| Customer Service | Responder preguntas frecuentes | Mensaje del usuario | Respuesta contextual |
| Menu Recommender | Sugerir platos basado en preferencias | Preferencias dietéticas | Recomendaciones personalizadas |
| Analytics | Generar insights de datos | Datos de transacciones | Reportes y métricas |

### 6.3 MCPs (Model Context Protocol)

```
mcps/
├── README.md
├── locations_mcp/           # MCP para datos de ubicaciones
│   ├── server.py
│   └── tools/
├── menu_mcp/                # MCP para datos de menú
│   ├── server.py
│   └── tools/
└── points_mcp/              # MCP para datos de puntos
    ├── server.py
    └── tools/
```

---

## 7. Capa de Datos (`data/`)

### 7.1 Organización

```
data/
├── raw/                     # Datos sin procesar
│   ├── locations.csv
│   ├── menu_items.csv
│   └── sample_members.csv
├── processed/               # Datos procesados
│   ├── locations_normalized.json
│   └── menu_by_location.json
├── evaluation/              # Datos para testing
│   ├── test_members.json
│   └── expected_outputs.json
└── pipelines/               # Scripts de procesamiento
    ├── normalize_locations.py
    └── import_members.py
```

### 7.2 Datos de Ejemplo

Ubicaciones Brasaland:
- **Colombia (10):**
  - Medellín: El Poblado, Laureles, Envigado, Sabaneta
  - Bogotá: Usaquén, Chapinero, Zona Rosa
  - Cali: Granada, Ciudad Jardín, Unicentro
- **Estados Unidos (4):**
  - Miami: Brickell, Coral Gables
  - Orlando: Downtown, International Drive

---

## 8. Automatización (`workflows/`)

### 8.1 Flujos n8n

```
workflows/
├── README.md
├── n8n/
│   ├── member_welcome.json         # Email de bienvenida
│   ├── points_notification.json    # Notificación de puntos
│   ├── weekly_report.json          # Reporte semanal
│   └── data_sync.json             # Sincronización de datos
└── cron/
    ├── daily_cleanup.py            # Limpieza diaria
    └── monthly_reports.py          # Reportes mensuales
```

### 8.2 Eventos y Triggers

| Trigger | Acción | Frecuencia |
|---------|--------|------------|
| Nuevo registro | Email de bienvenida + 100 puntos bonus | Inmediato |
| Transacción > $100,000 COP | Notificación de puntos ganados | Inmediato |
| Puntos canjeados | Actualización de balance | Inmediato |
| Fin de semana | Reporte de actividad | Semanal |
| Primer día del mes | Reporte consolidado | Mensual |

---

## 9. Paquetes Compartidos (`packages/`)

### 9.1 Estructura

```
packages/
├── shared/
│   ├── package.json          # @repo/shared-types
│   ├── types/
│   │   ├── member.ts         # Tipos de miembro
│   │   ├── location.ts       # Tipos de ubicación
│   │   ├── transaction.ts    # Tipos de transacción
│   │   └── index.ts          # Export central
│   ├── utils/
│   │   ├── formatters.ts     # Formateo de datos
│   │   ├── validators.ts     # Validaciones comunes
│   │   └── index.ts
│   └── constants/
│       ├── countries.ts      # Países soportados
│       └── index.ts
└── ui/                       # (Futuro) Componentes compartidos entre UIs
```

---

## 10. Infraestructura (`infra/`)

### 10.1 Docker

```yaml
# docker-compose.yml (raíz)
version: '3.8'

services:
  # Frontend - Brasaland Web
  brasaland-web:
    build: ./uis/brasaland-web
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000

  # Frontend - Backoffice
  backoffice:
    build: ./uis/backoffice
    ports:
      - "3001:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000

  # API Central
  api:
    build: ./services/api
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/brasaland
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  # Base de datos
  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=brasaland
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  # Cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # Worker de emails
  email-worker:
    build: ./services/workers
    environment:
      - SMTP_HOST=smtp.gmail.com
      - SMTP_PORT=587
    depends_on:
      - api

volumes:
  postgres_data:
```

### 12.2 CI/CD

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
```

---

## 11. Decisiones Técnicas

### 11.1 Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Frontend | Next.js 15 + React 19 | Server Components, SSR, SEO |
| Estilos | Tailwind CSS 4 | Utility-first, rápido de desarrollar |
| API | FastAPI (Python) | Alto rendimiento, async, auto-documentación |
| Base de datos | PostgreSQL | Relacional, confiable, JSON support |
| Cache | Redis | Sessions, rate limiting, caching |
| IA | Python + LLMs | Ecosistema maduro para ML/AI |
| Monorepo | pnpm workspaces | Eficiente,依存关系优化 |
| Contenedores | Docker + Docker Compose | Consistencia entre ambientes |

### 11.2 Patrones de Diseño

1. **Component Pattern:** Un componente por directorio con export limpio
2. **Service Layer:** Separación de lógica de negocio en `services/`
3. **Repository Pattern:** Acceso a datos abstraction
4. **Event-Driven:** Workflows responden a eventos del sistema

### 11.3 Convenciones de Código

**TypeScript/React:**
- Server Components por defecto
- `"use client"` solo cuando sea necesario
- TypeScript estricto
- ESLint + Prettier

**Python:**
- Type hints en todas las funciones
- Docstrings para funciones públicas
- Pydantic para validación de datos
- async/await para operaciones I/O

---

## 12. Flujo de Datos Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO: Registro Brasa Points                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Usuario completa formulario (Next.js)                       │
│     │                                                            │
│     ▼                                                            │
│  2. Validación client-side (validations.ts)                     │
│     │                                                            │
│     ▼                                                            │
│  3. POST /api/v1/members (FastAPI)                              │
│     │                                                            │
│     ├─▶ 4. Validación server-side (Pydantic)                   │
│     │                                                            │
│     ├─▶ 5. Insert en PostgreSQL                                 │
│     │                                                            │
│     ├─▶ 6. Asignar 100 puntos bonus                            │
│     │                                                            │
│     └─▶ 7. Publicar evento "member.created"                    │
│              │                                                   │
│              ▼                                                   │
│  8. Worker recibe evento                                        │
│     │                                                            │
│     ├─▶ 9. Enviar email de bienvenida                          │
│     │                                                            │
│     └─▶ 10. Notificar a n8n workflow                           │
│               │                                                  │
│               ▼                                                  │
│  11. Workflow de bienvenida                                     │
│      - Actualizar CRM                                           │
│      - Agregar a lista de marketing                             │
│      - Programar follow-up                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 13. Seguridad

### 13.1 Autenticación y Autorización

- **API Keys:** Para acceso interno entre servicios
- **JWT:** Para sesiones de usuario en backoffice
- **Rate Limiting:** Protección contra abuso
- **CORS:** Configuración restrictiva

### 13.2 Datos Sensibles

- Contraseñas: bcrypt con salt
- Tokens: Almacenamiento seguro en variables de entorno
- PII: Cumplimiento con GDPR/LGPD
- Logs: Sin información sensible

### 13.3 Dependencias

- Auditoría regular con `pnpm audit`
- Dependabot para actualizaciones automáticas
- Lock files committeados

---

## 14. Monitoreo y Observabilidad

### 14.1 Métricas

| Métrica | Descripción | Umbral |
|---------|-------------|--------|
| Request latency | Tiempo de respuesta API | < 200ms (p95) |
| Error rate | Porcentaje de errores | < 1% |
| Uptime | Disponibilidad del sistema | > 99.9% |
| Registration rate | Registros por hora | Monitoring |

### 14.2 Logging

```python
# Estructura de log estándar
{
    "timestamp": "2025-01-15T10:30:00Z",
    "level": "info",
    "service": "api",
    "message": "Member registered successfully",
    "member_id": "uuid",
    "request_id": "uuid"
}
```

### 14.3 Alertas

- Errores 5xx: Alerta inmediata
- Latencia alta: Notificación al equipo
- Disk usage > 80%: Alerta preventiva
- Failed logins: Notificación de seguridad

---

## 15. Plan de Implementación

### Fase 1: Fundación (Semanas 1-2)
- [x] Estructura base del monorepo
- [x] Configuración de pnpm workspaces
- [ ] Setup de Docker Compose
- [ ] CI/CD básico

### Fase 2: Frontend (Semanas 3-4)
- [x] Brasaland Web - Landing page
- [x] Componentes base (Button, Card, Header, Footer)
- [x] Formulario de registro con validaciones
- [ ] Responsive design completo
- [ ] Tests de componentes

### Fase 3: Backend (Semanas 5-6)
- [ ] API FastAPI básica
- [ ] Modelo de datos
- [ ] Endpoints de registro
- [ ] Integración con base de datos

### Fase 4: IA y Automatización (Semanas 7-8)
- [ ] Agente de atención al cliente
- [ ] Workflows de n8n
- [ ] Integración con email

### Fase 5: Backoffice (Semanas 9-10)
- [ ] Dashboard de administración
- [ ] Gestión de miembros
- [ ] Reportes

---

## 16. Métricas de Éxito

| Objetivo | Métrica | Meta |
|----------|---------|------|
| Adopción | Registros Brasa Points | 1,000 en primer mes |
| Rendimiento | Tiempo de carga | < 3 segundos |
| Calidad | Test coverage | > 80% |
| Satisfacción | NPS usuarios internos | > 8/10 |

---

## 17. Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Baja adopción del formulario | Alto | A/B testing, optimización de UX |
| Rendimiento de la API | Medio | Caching, CDN, optimización de queries |
| Seguridad de datos | Crítico | Auditorías, penetration testing |
| Mantenimiento de multiples UIs | Medio | Componentes compartidos, CI/CD automatizado |

---

## 18. Próximos Pasos

1. **Inmediato:** Completar setup de Docker y CI/CD
2. **Corto plazo:** Implementar API y conectar con frontend
3. **Mediano plazo:** Agregar agentes de IA y automatizaciones
4. **Largo plazo:** Backoffice completo y analytics avanzado

---

## 19. Referencias

- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Docker Compose](https://docs.docker.com/compose/)

---

**Autor:** Equipo de Arquitectura — Brasaland Digital  
**Fecha:** 2025  
**Versión:** 1.0  
**Estado:** Propuesta
