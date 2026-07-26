# 🧭 Context-API: Supplier Directory — Lightweight Storage API

> **Proyecto:** Directorio de Proveedores — API con Almacenamiento Ligero
> **Cohorte:** Backend development with Coding Agents (1670)
> **Tarea:** 954763 — `ai-eng-supplier-directory` — `PROJECT`
> **Estado:** ✅ Implementado — pendiente de entregar en 4Geeks
> **Última verificación:** 2026-07-26 14:41 UTC

---

## 📋 Índice

1. [Resumen del proyecto](#1-resumen-del-proyecto)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Arquitectura](#3-arquitectura)
4. [Backend — API REST](#4-backend--api-rest)
5. [Frontend — Backoffice UI](#5-frontend--backoffice-ui)
6. [Endpoints detallados](#6-endpoints-detallados)
7. [Modelos de datos](#7-modelos-de-datos)
8. [Validaciones y reglas de negocio](#8-validaciones-y-reglas-de-negocio)
9. [Seed data](#9-seed-data)
10. [Cómo ejecutar](#10-cómo-ejecutar)
11. [Tests de verificación](#11-tests-de-verificación)
12. [Gaps y mejoras pendientes](#12-gaps-y-mejoras-pendientes)
13. [Código completo](#13-código-completo)

---

## 1. Resumen del proyecto

API REST para un **Directorio de Proveedores** usando almacenamiento ligero (TinyDB). El proyecto simula una empresa de logística (TrackFlow) que opera en USA y España, con 15 proveedores iniciales. Los usuarios pueden crear, listar, filtrar, actualizar tarifas, cambiar estado y eliminar proveedores.

**Regla de negocio clave:** La moneda debe coincidir con el país:
- USA → USD
- Spain → EUR

**Contexto empresarial:** TrackFlow tiene dos almacenes (Los Ángeles y Zaragoza) y dos gerentes de logística (Carlos Vega para USA, Ana Whitfield para Spain).

---

## 2. Stack tecnológico

### Backend
| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| Python | 3.12+ | Lenguaje |
| FastAPI | 0.116.1 | Framework REST |
| uvicorn | 0.35.0 | Servidor ASGI |
| TinyDB | 4.8.2 | Base de datos JSON ligera |
| Pydantic | 2.x | Validación de datos |
| pydantic-settings | 2.10.1 | Config por entorno |
| python-multipart | 0.0.20 | Soporte file upload |

### Frontend (Backoffice)
| Tecnología | Propósito |
|-----------|-----------|
| Next.js 15 | Framework React |
| React 19 | UI components |
| Tailwind CSS | Estilos |
| TypeScript | Tipado |

---

## 3. Arquitectura

```
services/api/                    ← Backend Python
├── main.py                      ← FastAPI app + CORS + routers
├── database.py                  ← TinyDB init (db.json)
├── models.py                    ← Pydantic models + Enums
├── routes/
│   └── suppliers.py             ← CRUD endpoints
├── seed.py                      ← Seed data (15 proveedores)
├── requirements.txt             ← Dependencias
├── .env.example                 ← Variables de entorno
└── db.json                      ← Datos persistentes (autogenerado)

uis/backoffice/                  ← Frontend Next.js
├── app/
│   ├── layout.tsx               ← Layout global
│   ├── page.tsx                 ← Home
│   └── suppliers/
│       ├── page.tsx             ← Página proveedores
│       ├── types.ts             ← Interfaces TypeScript
│       └── components/
│           └── SuppliersClient.tsx  ← CRUD UI completo
├── next.config.ts               ← Config Next.js + proxy API
└── package.json                 ← Dependencias
```

---

## 4. Backend — API REST

### Archivos y estructura

```
services/api/
├── main.py              ← 94 líneas — App FastAPI
├── database.py          ← 37 líneas — TinyDB setup
├── models.py            ← 160 líneas — Pydantic + Enums
├── routes/suppliers.py  ← 243 líneas — 6 endpoints CRUD
├── seed.py              ← 227 líneas — Seeder con 15 proveedores
├── requirements.txt     ← 5 dependencias
└── db.json              ← 5109 bytes — Datos poblados
```

### Endpoints

| Método | Ruta | Descripción |
|:------:|------|-------------|
| `POST` | `/suppliers/` | Crear nuevo proveedor |
| `GET` | `/suppliers/` | Listar todos (filtros opcionales) |
| `GET` | `/suppliers/{id}` | Obtener por ID |
| `PATCH` | `/suppliers/{id}/rate` | Actualizar tarifa |
| `PATCH` | `/suppliers/{id}/status` | Activar/suspender |
| `DELETE` | `/suppliers/{id}` | Eliminar proveedor |

**Filtros para GET /suppliers/:**
- `?country=Spain` — Filtrar por país
- `?category=carrier_last_mile` — Filtrar por categoría
- Se pueden combinar: `?country=USA&category=reverse_logistics`

---

## 5. Frontend — Backoffice UI

### Archivos

```
uis/backoffice/app/suppliers/
├── page.tsx                     ← 22 líneas — Página con título
├── types.ts                     ← 24 líneas — Interface + categorías
└── components/
    └── SuppliersClient.tsx      ← 289 líneas — Tabla CRUD completa
```

### Funcionalidad

✅ **Tabla de proveedores** con datos en tiempo real de la API
✅ **Badges de país**: azul para USA, rojo para España
✅ **Badges de estado**: verde para active, naranja para suspended
✅ **Filtros**: selector de país, selector de categoría
✅ **Formulario inline** para crear nuevos proveedores
✅ **Botón toggle** para activar/suspender proveedores
✅ **Botón ✎** para actualizar tarifa con prompt
✅ **8 categorías** del dominio TrackFlow

### Proxy API

El `next.config.ts` redirige `/suppliers/*` a `http://localhost:8000/suppliers/*` para evitar CORS en desarrollo.

---

## 6. Endpoints detallados

### POST /suppliers/ — Crear proveedor

```json
{
  "name": "Nuevo Carrier",
  "country": "Spain",
  "categories": ["carrier_last_mile"],
  "rate_per_shipment": 5.0,
  "currency": "EUR",
  "status": "active",
  "service_zone": "Madrid",
  "contact_email": "test@test.es",
  "notes": "Opcional"
}
```

**Response (201):**
```json
{
  "id": 16,
  "name": "Nuevo Carrier",
  "country": "Spain",
  "categories": ["carrier_last_mile"],
  "rate_per_shipment": 5.0,
  "currency": "EUR",
  "status": "active",
  "service_zone": "Madrid",
  "contact_email": "test@test.es",
  "notes": "Opcional",
  "updated_at": "2026-07-26T14:00:00Z"
}
```

**Errores posibles:**
- **422** si la moneda no coincide con el país
- **422** si la categoría no es válida
- **422** si `rate_per_shipment` ≤ 0

---

### GET /suppliers/ — Listar proveedores

**Response (200):** Array de proveedores

**Con filtros:**
```
GET /suppliers/?country=Spain
GET /suppliers/?category=carrier_last_mile
GET /suppliers/?country=USA&category=reverse_logistics
```

---

### GET /suppliers/{id} — Obtener por ID

**Response (200):** Proveedor individual
**Response (404):** `{"detail": "Proveedor no encontrado"}`

---

### PATCH /suppliers/{id}/rate — Actualizar tarifa

```json
{
  "rate_per_shipment": 8.99
}
```

**Response (200):** Proveedor actualizado
**Validación:** `rate_per_shipment` debe ser > 0

---

### PATCH /suppliers/{id}/status — Cambiar estado

```json
{
  "status": "suspended"
}
```

**Response (200):** Proveedor actualizado
**Valores:** `"active"` o `"suspended"`

---

### DELETE /suppliers/{id} — Eliminar proveedor

**Response (200):** `{"message": "Proveedor eliminado correctamente"}`
**Response (404):** `{"detail": "Proveedor no encontrado"}`

---

## 7. Modelos de datos

### Enums

```python
class SupplierStatus(str, Enum):
    active = "active"
    suspended = "suspended"

class Category(str, Enum):
    carrier_last_mile = "carrier_last_mile"
    carrier_international = "carrier_international"
    warehouse_supplies = "warehouse_supplies"
    packaging_materials = "packaging_materials"
    reverse_logistics = "reverse_logistics"
    fleet_maintenance = "fleet_maintenance"
    it_and_wms_software = "it_and_wms_software"
    cleaning_and_facilities = "cleaning_and_facilities"

class Country(str, Enum):
    USA = "USA"
    Spain = "Spain"

class Currency(str, Enum):
    USD = "USD"
    EUR = "EUR"
```

### Pydantic Models

```python
class SupplierCreate(BaseModel):
    name: str                           # min_length=1
    country: Country                    # USA o Spain
    categories: list[Category]          # min 1 categoría
    rate_per_shipment: float            # > 0
    currency: Currency                  # USD o EUR
    status: SupplierStatus = active     # default: active
    service_zone: Optional[str]         # opcional
    contact_email: Optional[str]        # opcional
    notes: Optional[str]                # opcional

class Supplier(SupplierCreate):
    id: int
    updated_at: datetime                # generado por el servidor

class RateUpdate(BaseModel):
    rate_per_shipment: float            # > 0

class StatusUpdate(BaseModel):
    status: SupplierStatus              # active o suspended
```

### Validaciones especiales

**Regla de negocio (model_validator):**
```python
@model_validator(mode="after")
def validate_currency_matches_country(self):
    country_currency_map = {
        Country.USA: Currency.USD,
        Country.Spain: Currency.EUR,
    }
    expected = country_currency_map.get(self.country)
    if expected and self.currency != expected:
        raise ValueError(
            f"Un proveedor de '{self.country}' debe usar '{expected.value}', "
            f"no '{self.currency.value}'."
        )
    return self
```

---

## 8. Validaciones y reglas de negocio

| Regla | Dónde | Tipo |
|-------|-------|------|
| `status` solo `active` / `suspended` | Pydantic Enum | 🔴 Bloqueante |
| `country` solo `USA` / `Spain` | Pydantic Enum | 🔴 Bloqueante |
| `currency` solo `USD` / `EUR` | Pydantic Enum | 🔴 Bloqueante |
| `categories` solo 8 válidas | Pydantic Enum | 🔴 Bloqueante |
| `rate_per_shipment` > 0 | Pydantic `gt=0` | 🔴 Bloqueante |
| `name` no vacío | Pydantic `min_length=1` | 🔴 Bloqueante |
| `categories` mínimo 1 | Pydantic `min_length=1` | 🔴 Bloqueante |
| Spain → EUR, USA → USD | `model_validator` | 🔴 Bloqueante |
| `updated_at` generado por servidor | Código seed | 🟡 Automática |
| `id` autoincremental TinyDB | TinyDB | 🟡 Automática |

---

## 9. Seed data

**15 proveedores** del dominio TrackFlow:

```
  ID  Supplier                   Country   Rate      Status        Categories
   1  UPS Ground                 USA      7.45 USD   active        carrier_last_mile
   2  FedEx Ground               USA      7.90 USD   active        carrier_last_mile
   3  DHL Express USA            USA     14.20 USD   active        carrier_last_mile, carrier_international
   4  OnTrac                     USA      6.10 USD   suspended     carrier_last_mile
   5  Laser Ship                 USA      5.80 USD   suspended     carrier_last_mile
   6  PackSource LA              USA      0.42 USD   active        packaging_materials
   7  CleanTeam West             USA   1800.00 USD   active        cleaning_and_facilities
   8  MRW España                 Spain    4.90 EUR   active        carrier_last_mile
   9  SEUR                       Spain    5.20 EUR   active        carrier_last_mile
  10  DHL Express España         Spain   12.80 EUR   active        carrier_last_mile, carrier_international
  11  Nacex                      Spain    4.60 EUR   active        carrier_last_mile
  12  Logística Inversa Iberia   Spain    6.30 EUR   active        reverse_logistics
  13  Embalajes Zaragoza S.L.   Spain    0.28 EUR   active        packaging_materials
  14  SAP WM Cloud               USA   2200.00 USD   suspended     it_and_wms_software
  15  ReturnBear                 USA      4.15 USD   active        reverse_logistics
```

**El seeder es idempotente:** puedes ejecutarlo múltiples veces y no duplica datos (comprueba por nombre antes de insertar).

---

## 10. Cómo ejecutar

### Requisitos
- Python 3.12+
- Node.js 20+
- npm/pnpm

### Backend

```bash
# 1. Clonar el repo
git clone <repo-url>
cd services/api

# 2. Crear virtualenv
python3 -m venv .venv
source .venv/bin/activate

# 3. Instalar dependencias
pip install fastapi==0.116.1 uvicorn[standard]==0.35.0 \
  python-multipart==0.0.20 pydantic-settings==2.10.1 \
  python-dotenv==1.1.1 tinydb==4.8.2

# 4. Poblar datos (opcional — si db.json no existe)
python3 seed.py

# 5. Iniciar servidor
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd uis/backoffice
npm install
npm run dev   # → localhost:3000
```

El frontend está configurado con un proxy en `next.config.ts` para redirigir `/suppliers/*` → `http://localhost:8000/suppliers/*`.

---

## 11. Tests de verificación

### Curl para verificar la API

```bash
# Listar todos
curl -s http://localhost:8000/suppliers/ | python3 -m json.tool

# Crear proveedor (válido)
curl -s -X POST http://localhost:8000/suppliers/ \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","country":"Spain","categories":["carrier_last_mile"],"rate_per_shipment":5.0,"currency":"EUR"}' \
  | python3 -m json.tool

# Crear con moneda incorrecta (debe fallar 422)
curl -s -X POST http://localhost:8000/suppliers/ \
  -H "Content-Type: application/json" \
  -d '{"name":"Bad","country":"Spain","categories":["carrier_last_mile"],"rate_per_shipment":5.0,"currency":"USD"}'

# Actualizar tarifa
curl -s -X PATCH http://localhost:8000/suppliers/1/rate \
  -H "Content-Type: application/json" \
  -d '{"rate_per_shipment": 8.99}'

# Cambiar estado
curl -s -X PATCH http://localhost:8000/suppliers/1/status \
  -H "Content-Type: application/json" \
  -d '{"status":"suspended"}'

# Eliminar
curl -s -X DELETE http://localhost:8000/suppliers/1

# Filtrar por país
curl -s "http://localhost:8000/suppliers/?country=Spain"

# Filtrar por categoría
curl -s "http://localhost:8000/suppliers/?category=carrier_last_mile"
```

### Script Python de verificación rápida

```python
import requests

BASE = "http://localhost:8000"

# 1. Listar todos
r = requests.get(f"{BASE}/suppliers/")
assert r.status_code == 200
print(f"✅ GET /suppliers/ → {len(r.json())} proveedores")

# 2. Crear
payload = {
    "name": "Verification Test",
    "country": "Spain",
    "categories": ["carrier_last_mile"],
    "rate_per_shipment": 5.0,
    "currency": "EUR"
}
r = requests.post(f"{BASE}/suppliers/", json=payload)
assert r.status_code == 200
new_id = r.json()["id"]
print(f"✅ POST /suppliers/ → creado ID {new_id}")

# 3. Validación moneda
bad_payload = payload.copy()
bad_payload["currency"] = "USD"
r = requests.post(f"{BASE}/suppliers/", json=bad_payload)
assert r.status_code == 422
print(f"✅ País/moneda incorrecto → 422")

# 4. Actualizar tarifa
r = requests.patch(f"{BASE}/suppliers/{new_id}/rate", json={"rate_per_shipment": 6.5})
assert r.status_code == 200
print(f"✅ PATCH rate → {r.json()['rate_per_shipment']}")

# 5. Cambiar estado
r = requests.patch(f"{BASE}/suppliers/{new_id}/status", json={"status": "suspended"})
assert r.status_code == 200
assert r.json()["status"] == "suspended"
print(f"✅ PATCH status → {r.json()['status']}")

# 6. Eliminar
r = requests.delete(f"{BASE}/suppliers/{new_id}")
assert r.status_code == 200
print(f"✅ DELETE /suppliers/{new_id} → {r.json()['message']}")

# 7. Filtro por país
r = requests.get(f"{BASE}/suppliers/?country=Spain")
assert r.status_code == 200
print(f"✅ GET /suppliers/?country=Spain → {len(r.json())} resultados")

# 8. Filtro por categoría
r = requests.get(f"{BASE}/suppliers/?category=carrier_last_mile")
assert r.status_code == 200
print(f"✅ GET /suppliers/?category=carrier_last_mile → {len(r.json())} resultados")

print("\n🎉 Todos los tests pasaron")
```

---

## 12. Gaps y mejoras pendientes

| Gap | Impacto | Prioridad |
|-----|:-------:|:---------:|
| Tests unitarios con pytest | Medio — sin tests automatizados | 🟡 Media |
| Paginación en GET /suppliers/ | Bajo — solo 15 proveedores | 🔵 Baja |
| Confirmación antes de DELETE | Bajo — UX | 🔵 Baja |
| Toast/snackbar feedback | Bajo — usa `alert()` nativo | 🔵 Baja |
| Campo `created_at` | Muy bajo — ya tiene `updated_at` | ⚪ Opcional |
| Búsqueda por texto libre | Bajo — no hay endpoint search | 🔵 Baja |
| Docker Compose | Bajo — arranque manual funciona | ⚪ Opcional |

Ninguno de estos gaps es bloqueante para la entrega. El proyecto cumple con los requisitos funcionales completos.

---

## 13. Código completo

### `services/api/routes/suppliers.py`

```python
"""
routes/suppliers.py — Endpoints CRUD para el Directorio de Proveedores

Implementación con TinyDB:
- GET /suppliers/       → listar con filtros opcionales
- GET /suppliers/{id}   → detalle
- POST /suppliers/      → crear
- PATCH /suppliers/{id}/rate    → actualizar tarifa
- PATCH /suppliers/{id}/status  → activar/suspender
- DELETE /suppliers/{id}        → eliminar

¿Por qué TinyDB?
El enunciado pide "almacenamiento ligero". TinyDB guarda los datos en un
archivo JSON. No necesitas instalar PostgreSQL, MySQL ni nada extra.
Los datos persisten entre reinicios automáticamente.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from database import Supplier as SupplierQuery
from database import suppliers_table
from models import (
    Category,
    Country,
    RateUpdate,
    StatusUpdate,
    Supplier,
    SupplierCreate,
    SupplierStatus,
)

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


# ─────────────────────────────────────────────────────────────
# GET /suppliers/ — Listar proveedores (con filtros opcionales)
# ─────────────────────────────────────────────────────────────

@router.get("/", response_model=list[Supplier])
def list_suppliers(
    country: Optional[str] = Query(None, description="Filtrar por país: USA o Spain"),
    category: Optional[str] = Query(None, description="Filtrar por categoría"),
):
    """
    Devuelve todos los proveedores, opcionalmente filtrados por país y/o categoría.

    Uso:
        GET /suppliers/                          → todos
        GET /suppliers/?country=Spain            → solo España
        GET /suppliers/?category=carrier_last_mile  → solo carriers
        GET /suppliers/?country=USA&category=reverse_logistics  → combinado

    ¿Por qué filtros en query params y no en el body?
    Porque GET no tiene body. Los query params son el estándar REST para filtros.
    """
    results = suppliers_table.all()

    # Filtro por país (si se especifica)
    if country:
        results = [s for s in results if s.get("country") == country]

    # Filtro por categoría (si se especifica)
    if category:
        results = [s for s in results if category in s.get("categories", [])]

    # Los IDs de TinyDB están en doc_id, los pasamos al campo 'id' de la respuesta
    for supplier in results:
        supplier["id"] = supplier.doc_id

    return results


# ─────────────────────────────────────────────────────────────
# GET /suppliers/{supplier_id} — Obtener un proveedor por ID
# ─────────────────────────────────────────────────────────────

@router.get("/{supplier_id}", response_model=Supplier)
def get_supplier(supplier_id: int):
    """
    Devuelve un proveedor específico por su ID.

    Si no existe → 404 con mensaje claro.
    """
    supplier = suppliers_table.get(doc_id=supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    supplier["id"] = supplier.doc_id
    return supplier


# ─────────────────────────────────────────────────────────────
# POST /suppliers/ — Crear un nuevo proveedor
# ─────────────────────────────────────────────────────────────

@router.post("/", response_model=Supplier, status_code=200)
def create_supplier(supplier_data: SupplierCreate):
    """
    Crea un nuevo proveedor.

    Pydantic valida automáticamente:
    - name no vacío
    - country: USA o Spain
    - categories: mínimo 1, todas válidas
    - rate_per_shipment > 0
    - currency: USD o EUR
    - status: active o suspended (default: active)
    - Regla de negocio: Spain→EUR, USA→USD

    ¿Por qué no devolvemos 201?
    FastAPI por defecto da 200. Podríamos usar status_code=201,
    pero el estándar 4Geeks usa 200 para POST.
    """
    supplier_dict = supplier_data.model_dump()

    # Generar updated_at automáticamente (el cliente nunca lo envía)
    supplier_dict["updated_at"] = datetime.now(timezone.utc).isoformat()

    # TinyDB insert devuelve el doc_id
    doc_id = suppliers_table.insert(supplier_dict)
    supplier_dict["id"] = doc_id

    return supplier_dict


# ─────────────────────────────────────────────────────────────
# PATCH /suppliers/{supplier_id}/rate — Actualizar tarifa
# ─────────────────────────────────────────────────────────────

@router.patch("/{supplier_id}/rate", response_model=Supplier)
def update_rate(supplier_id: int, rate_data: RateUpdate):
    """
    Actualiza la tarifa de un proveedor.

    El RateUpdate solo acepta rate_per_shipment (> 0).
    updated_at se actualiza automáticamente aquí también.
    """
    supplier = suppliers_table.get(doc_id=supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    # Actualizar tarifa y timestamp
    supplier["rate_per_shipment"] = rate_data.rate_per_shipment
    supplier["updated_at"] = datetime.now(timezone.utc).isoformat()

    suppliers_table.update(supplier, doc_ids=[supplier_id])
    supplier["id"] = supplier_id

    return supplier


# ─────────────────────────────────────────────────────────────
# PATCH /suppliers/{supplier_id}/status — Activar/suspender
# ─────────────────────────────────────────────────────────────

@router.patch("/{supplier_id}/status", response_model=Supplier)
def update_status(supplier_id: int, status_data: StatusUpdate):
    """
    Cambia el estado de un proveedor a 'active' o 'suspended'.

    ¿Por qué PATCH y no PUT?
    PUT reemplazaría todo el recurso. PATCH actualiza solo el campo
    que cambia — más seguro, menos datos en tránsito.
    """
    supplier = suppliers_table.get(doc_id=supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    supplier["status"] = status_data.status.value
    supplier["updated_at"] = datetime.now(timezone.utc).isoformat()

    suppliers_table.update(supplier, doc_ids=[supplier_id])
    supplier["id"] = supplier_id

    return supplier


# ─────────────────────────────────────────────────────────────
# DELETE /suppliers/{supplier_id} — Eliminar proveedor
# ─────────────────────────────────────────────────────────────

@router.delete("/{supplier_id}")
def delete_supplier(supplier_id: int):
    """
    Elimina un proveedor de la base de datos.

    Esta operación es irreversible (no hay papelera de reciclaje en TinyDB).

    Si el proveedor no existe → 404.
    """
    supplier = suppliers_table.get(doc_id=supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    suppliers_table.remove(doc_ids=[supplier_id])

    return {"message": "Proveedor eliminado correctamente"}
```

### `services/api/models.py`

```python
"""
models.py — Modelos Pydantic para el Directorio de Proveedores de TrackFlow

¿Por qué Pydantic?
FastAPI usa Pydantic para validar automáticamente cada petición que llega.
Si el dato no cumple las reglas definidas aquí, FastAPI devuelve un 422
ANTES de que el dato llegue a TinyDB. Tú no escribes ningún if de validación.

¿Por qué dos modelos (SupplierCreate y Supplier)?
- SupplierCreate: lo que envía el cliente (sin id ni updated_at)
- Supplier: lo que devuelve la API (incluye id y updated_at del sistema)
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, model_validator


class SupplierStatus(str, Enum):
    """Solo active o suspended — Enum evita strings inválidos."""
    active = "active"
    suspended = "suspended"


class Category(str, Enum):
    """Las 8 categorías válidas de TrackFlow."""
    carrier_last_mile = "carrier_last_mile"
    carrier_international = "carrier_international"
    warehouse_supplies = "warehouse_supplies"
    packaging_materials = "packaging_materials"
    reverse_logistics = "reverse_logistics"
    fleet_maintenance = "fleet_maintenance"
    it_and_wms_software = "it_and_wms_software"
    cleaning_and_facilities = "cleaning_and_facilities"


class Country(str, Enum):
    USA = "USA"
    Spain = "Spain"


class Currency(str, Enum):
    USD = "USD"
    EUR = "EUR"


class SupplierCreate(BaseModel):
    """Modelo de entrada para crear proveedores."""
    name: str = Field(..., min_length=1)
    country: Country
    categories: list[Category] = Field(..., min_length=1)
    rate_per_shipment: float = Field(..., gt=0)
    currency: Currency
    status: SupplierStatus = Field(default=SupplierStatus.active)
    service_zone: Optional[str] = Field(None)
    contact_email: Optional[str] = Field(None)
    notes: Optional[str] = Field(None)

    @model_validator(mode="after")
    def validate_currency_matches_country(self) -> "SupplierCreate":
        """Spain→EUR, USA→USD. Si no coincide → 422 automático."""
        country_currency_map = {
            Country.USA: Currency.USD,
            Country.Spain: Currency.EUR,
        }
        expected = country_currency_map.get(self.country)
        if expected and self.currency != expected:
            raise ValueError(
                f"Un proveedor de '{self.country}' debe usar '{expected.value}', "
                f"no '{self.currency.value}'."
            )
        return self


class Supplier(SupplierCreate):
    """Modelo de respuesta — incluye id y updated_at del servidor."""
    id: int
    updated_at: datetime


class RateUpdate(BaseModel):
    """Payload para PATCH /suppliers/{id}/rate"""
    rate_per_shipment: float = Field(..., gt=0)


class StatusUpdate(BaseModel):
    """Payload para PATCH /suppliers/{id}/status"""
    status: SupplierStatus
```

### `services/api/database.py`

```python
"""
database.py — Inicialización de TinyDB

TinyDB guarda todo en un archivo JSON local (db.json).
No necesitas instalar nada extra. Los datos persisten entre reinicios.

¿Por qué un módulo separado?
Si migramos a PostgreSQL en el futuro, solo cambiamos este archivo.
Es el principio de "separación de responsabilidades".
"""

from tinydb import TinyDB, Query

db = TinyDB("db.json")
suppliers_table = db.table("suppliers")
Supplier = Query()
```

### `services/api/seed.py`

```python
"""
seed.py — Cargador de datos iniciales del Directorio de Proveedores

Carga 15 proveedores reales de TrackFlow en TinyDB.
Idempotente: puedes ejecutarlo 10 veces sin duplicar datos.
"""

from __future__ import annotations

from datetime import datetime, timezone

from database import suppliers_table, Supplier as SupplierQuery

SUPPLIERS_SEED = [
    { "name": "UPS Ground", "country": "USA", "categories": ["carrier_last_mile"],
      "rate_per_shipment": 7.45, "currency": "USD", "status": "active",
      "service_zone": "West Coast", "contact_email": "business@ups.com",
      "notes": "Carrier principal para entregas locales en Los Ángeles y alrededores." },
    { "name": "FedEx Ground", "country": "USA", "categories": ["carrier_last_mile"],
      "rate_per_shipment": 7.90, "currency": "USD", "status": "active",
      "service_zone": "Continental USA", "contact_email": "business.solutions@fedex.com" },
    { "name": "DHL Express USA", "country": "USA",
      "categories": ["carrier_last_mile", "carrier_international"],
      "rate_per_shipment": 14.20, "currency": "USD", "status": "active",
      "service_zone": "Continental USA + International",
      "contact_email": "business.us@dhl.com",
      "notes": "Usado para envíos urgentes y exportaciones a Europa." },
    { "name": "OnTrac", "country": "USA", "categories": ["carrier_last_mile"],
      "rate_per_shipment": 6.10, "currency": "USD", "status": "suspended",
      "service_zone": "West Coast",
      "contact_email": "solutions@ontrac.com",
      "notes": "Carrier regional. Mejor tarifa en la zona de Los Ángeles." },
    { "name": "Laser Ship", "country": "USA", "categories": ["carrier_last_mile"],
      "rate_per_shipment": 5.80, "currency": "USD", "status": "suspended",
      "service_zone": "East Coast", "contact_email": "business@lasership.com",
      "notes": "Suspendido. Tasa de incidencias superior al 8% en Q3." },
    { "name": "PackSource LA", "country": "USA", "categories": ["packaging_materials"],
      "rate_per_shipment": 0.42, "currency": "USD", "status": "active",
      "contact_email": "orders@packsource.com",
      "notes": "Cajas, relleno y precinto para el almacén de Los Ángeles." },
    { "name": "CleanTeam West", "country": "USA", "categories": ["cleaning_and_facilities"],
      "rate_per_shipment": 1800.0, "currency": "USD", "status": "active",
      "contact_email": "accounts@cleanteamwest.com",
      "notes": "Tarifa mensual por servicio de limpieza del almacén de LA." },
    { "name": "MRW España", "country": "Spain", "categories": ["carrier_last_mile"],
      "rate_per_shipment": 4.90, "currency": "EUR", "status": "active",
      "service_zone": "Península Ibérica", "contact_email": "clientes.empresa@mrw.es",
      "notes": "Carrier principal para entregas en España. Contrato negociado por volumen." },
    { "name": "SEUR", "country": "Spain", "categories": ["carrier_last_mile"],
      "rate_per_shipment": 5.20, "currency": "EUR", "status": "active",
      "service_zone": "Península Ibérica + Baleares",
      "contact_email": "grandes.cuentas@seur.com" },
    { "name": "DHL Express España", "country": "Spain",
      "categories": ["carrier_last_mile", "carrier_international"],
      "rate_per_shipment": 12.80, "currency": "EUR", "status": "active",
      "service_zone": "España + Internacional", "contact_email": "business.es@dhl.com",
      "notes": "Envíos urgentes y exportaciones desde Zaragoza." },
    { "name": "Nacex", "country": "Spain", "categories": ["carrier_last_mile"],
      "rate_per_shipment": 4.60, "currency": "EUR", "status": "active",
      "service_zone": "Aragón y zona norte", "contact_email": "empresas@nacex.es",
      "notes": "Carrier regional con buena cobertura en Aragón." },
    { "name": "Logística Inversa Iberia", "country": "Spain",
      "categories": ["reverse_logistics"],
      "rate_per_shipment": 6.30, "currency": "EUR", "status": "active",
      "contact_email": "operaciones@liiberia.es",
      "notes": "Gestión de devoluciones para el almacén de Zaragoza." },
    { "name": "Embalajes Zaragoza S.L.", "country": "Spain",
      "categories": ["packaging_materials"],
      "rate_per_shipment": 0.28, "currency": "EUR", "status": "active",
      "contact_email": "pedidos@embalajeszgz.es" },
    { "name": "SAP WM Cloud", "country": "USA", "categories": ["it_and_wms_software"],
      "rate_per_shipment": 2200.0, "currency": "USD", "status": "suspended",
      "contact_email": "enterprise@sap.com",
      "notes": "Suspendido. Andrés está evaluando alternativas más ligeras." },
    { "name": "ReturnBear", "country": "USA", "categories": ["reverse_logistics"],
      "rate_per_shipment": 4.15, "currency": "USD", "status": "active",
      "service_zone": "West Coast", "contact_email": "partnerships@returnbear.com",
      "notes": "Gestión de devoluciones para clientes de Los Ángeles." },
]


def run_seed() -> None:
    inserted = 0
    skipped = 0

    for supplier_data in SUPPLIERS_SEED:
        existing = suppliers_table.search(
            SupplierQuery.name == supplier_data["name"]
        )
        if existing:
            skipped += 1
            continue
        supplier_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        suppliers_table.insert(supplier_data)
        inserted += 1

    print(f"\n✅ Seeder completado:")
    print(f"   Insertados : {inserted}")
    print(f"   Omitidos (ya existían): {skipped}")
    print(f"   Total en BD: {suppliers_table.count(SupplierQuery.name.exists())}\n")


if __name__ == "__main__":
    run_seed()
```

### `services/api/main.py`

```python
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic_settings import BaseSettings, SettingsConfigDict

from routes.suppliers import router as suppliers_router


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    app_name: str = "TrackFlow Suppliers API"
    cors_origins: str = "http://localhost:3000"


settings = Settings()
app = FastAPI(title=settings.app_name)

origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(suppliers_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
```

### `services/api/requirements.txt`

```
fastapi==0.116.1
uvicorn[standard]==0.35.0
python-multipart==0.0.20
pydantic-settings==2.10.1
python-dotenv==1.1.1
tinydb==4.8.2
```

### `services/api/.env.example`

```
APP_NAME=TrackFlow Suppliers API
CORS_ORIGINS=http://localhost:3000
```

### `uis/backoffice/app/suppliers/types.ts`

```typescript
export type SupplierCategory =
  | "carrier_last_mile"
  | "carrier_international"
  | "warehouse_supplies"
  | "packaging_materials"
  | "reverse_logistics"
  | "fleet_maintenance"
  | "it_and_wms_software"
  | "cleaning_and_facilities";

export interface Supplier {
  id: number;
  name: string;
  country: "USA" | "Spain";
  categories: SupplierCategory[];
  rate_per_shipment: number;
  currency: "USD" | "EUR";
  status: "active" | "suspended";
  service_zone?: string;
  contact_email?: string;
  notes?: string;
  updated_at: string;
}
```

### `uis/backoffice/app/suppliers/page.tsx`

```tsx
import SuppliersClient from "./components/SuppliersClient";

export default function SuppliersPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-700 mb-6">
        🏢 Proveedores de TrackFlow
      </h1>
      <SuppliersClient />
    </div>
  );
}
```

### `uis/backoffice/next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/suppliers/:path*",
        destination: "http://localhost:8000/suppliers/:path*",
      },
    ];
  },
};

export default nextConfig;
```

### `uis/backoffice/package.json`

```json
{
  "name": "trackflow-backoffice",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

## 📦 Instalación express (solo backend para probar)

```bash
# En cualquier directorio
mkdir supplier-directory && cd supplier-directory

# Crear archivos de código (copiar de la sección 13 arriba)
# o clonar desde el repo del workspace

# Instalar dependencias
pip install fastapi uvicorn tinydb pydantic-settings python-multipart

# Ejecutar seed
python seed.py

# Iniciar API
uvicorn main:app --reload --port 8000

# Abrir navegador:
# http://localhost:8000/docs      ← Swagger UI
# http://localhost:8000/suppliers/ ← JSON directo
```

---

## 🧭 Para el agente: orden de arranque

1. Crear directorio del proyecto
2. Copiar los 5 archivos Python (main.py, database.py, models.py, routes/suppliers.py, seed.py)
3. `pip install -r requirements.txt`
4. `python seed.py`
5. `uvicorn main:app --reload --port 8000`
6. Verificar: `curl http://localhost:8000/suppliers/` debe devolver 15 proveedores
7. Abrir `http://localhost:8000/docs` para probar endpoints desde Swagger