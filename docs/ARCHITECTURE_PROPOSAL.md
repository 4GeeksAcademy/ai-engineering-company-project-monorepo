# Propuesta de Arquitectura de Backend — TrackFlow

---

## 1. Contexto del negocio y objetivos del backend

**TrackFlow** es una empresa de tecnología logística enfocada en la entrega de última milla y operaciones de almacén en México y España. Opera dos interfaces principales:

- **`uis/website`**: sitio web público para que los clientes consulten productos, disponibilidad y seguimiento de envíos.
- **`uis/backoffice`**: panel interno para que el equipo de operaciones gestione inventario, transportistas, envíos y alertas.

Ambas interfaces comparten la lógica de negocio a través de `packages/logic`, un paquete TypeScript común que centraliza reglas de costeo, puntuación de transportistas, filtros, validaciones y generación de reportes.

### ¿Qué necesita el backend?

El backend debe exponer una API REST que:

1. **Sirva datos al website y al backoffice** desde una única fuente autorizada.
2. **Gestione las entidades core**: Productos (`Product`), Transportistas (`Carrier`) y Envíos (`Shipment`).
3. **Ejecute reglas de negocio** que hoy viven en `packages/logic` pero que deben ser replicadas o delegadas al backend.
4. **Soporte operaciones críticas**: asignación de transportistas, alertas de stock bajo, trazabilidad de envíos.
5. **Sea extensible** para nuevos dominios (reportes, usuarios, autenticación) sin reestructurar todo.

---

## 2. Patrón arquitectónico elegido: Arquitectura en Capas (Layered Architecture) con orientación a dominio

### Decisión: **Arquitectura en Capas organizada por dominio**

He elegido este patrón por las siguientes razones vinculadas directamente a TrackFlow:

| Característica de TrackFlow | Por qué encaja con Capas + Dominio |
|---|---|
| **Dos interfaces distintas (website y backoffice)** consumiendo los mismos datos | La capa de API separa la exposición de datos de la lógica de negocio. Ambos frontends consumen los mismos endpoints sin duplicar reglas. |
| **Reglas de negocio complejas** (costeo, puntuación, selección de transportistas) | La capa de servicios (`services`) aísla las reglas de negocio de los detalles de infraestructura, facilitando testing y mantenimiento. |
| **Entidades bien definidas** (Product, Carrier, Shipment) con sus propios flujos | La organización por dominio permite que cada entidad tenga su propio conjunto de archivos (router, schema, service, repository), manteniendo el código ordenado y escalable. |
| **Operaciones en dos países** (México y España) con posibles diferencias regulatorias | La separación por capas permite cambiar la lógica de persistencia o validación sin afectar la API expuesta. |
| **Crecimiento futuro previsible** (reportes, dashboards, autenticación) | Cada nuevo dominio se añade como un módulo independiente sin tocar los existentes. |

### ¿Por qué no otros patrones?

- **MVC tradicional**: Aunque es válido, tiende a acoplar la lógica de negocio a los controladores. En TrackFlow, donde las reglas de selección de transportistas son complejas, necesitamos una separación más estricta.
- **Serverless**: No es adecuado porque TrackFlow requiere estado compartido, conexiones persistentes a base de datos y operaciones que pueden superar los límites de tiempo de ejecución de funciones serverless.
- **Arquitectura hexagonal (Ports & Adapters)**: Sería ideal a largo plazo, pero para un primer backend donde el equipo necesita claridad y rapidez, la arquitectura en capas ofrece un equilibrio óptimo entre estructura y simplicidad.

---

## 3. Estructura de carpetas y módulos propuesta

La estructura sigue la convención estándar de FastAPI documentada oficialmente en [Bigger Applications — Multiple Files](https://fastapi.tiangolo.com/tutorial/bigger-applications/), donde la aplicación se organiza como un paquete Python con submódulos por dominio.

```
services/backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # Punto de entrada: crea la app FastAPI
│   ├── config.py                  # Configuración centralizada (Pydantic Settings)
│   ├── dependencies.py            # Dependencias compartidas (auth, DB session)
│   │
│   ├── api/                       # Capa de presentación (routers)
│   │   ├── __init__.py
│   │   ├── v1/                    # Versionado de API
│   │   │   ├── __init__.py
│   │   │   ├── products.py        # Endpoints de productos
│   │   │   ├── carriers.py        # Endpoints de transportistas
│   │   │   ├── shipments.py       # Endpoints de envíos
│   │   │   ├── inventory.py       # Endpoints de inventario y alertas
│   │   │   └── health.py          # Health check
│   │   └── deps.py                # Dependencias específicas de API
│   │
│   ├── schemas/                   # Modelos Pydantic (request/response)
│   │   ├── __init__.py
│   │   ├── product.py
│   │   ├── carrier.py
│   │   └── shipment.py
│   │
│   ├── services/                  # Lógica de negocio (casos de uso)
│   │   ├── __init__.py
│   │   ├── product_service.py
│   │   ├── carrier_service.py
│   │   ├── shipment_service.py
│   │   └── selection_service.py   # Algoritmo de selección de transportistas
│   │
│   ├── repositories/              # Acceso a datos (abstracción de DB)
│   │   ├── __init__.py
│   │   ├── product_repository.py
│   │   ├── carrier_repository.py
│   │   └── shipment_repository.py
│   │
│   ├── models/                    # Modelos SQLAlchemy / ORM (si aplica)
│   │   ├── __init__.py
│   │   ├── product.py
│   │   ├── carrier.py
│   │   └── shipment.py
│   │
│   └── core/                      # Configuración transversal
│       ├── __init__.py
│       ├── security.py            # Autenticación, JWT, hashing
│       ├── logging.py             # Configuración de logging
│       └── exceptions.py          # Manejadores de errores personalizados
│
├── tests/                         # Tests unitarios y de integración
│   ├── __init__.py
│   ├── conftest.py                # Fixtures compartidos
│   ├── test_products.py
│   ├── test_carriers.py
│   └── test_shipments.py
│
├── alembic/                       # Migraciones de base de datos (si aplica)
│   └── versions/
│
├── requirements.txt               # Dependencias del proyecto
├── .env.example                   # Variables de entorno de ejemplo
└── pyproject.toml                 # Configuración del proyecto (entrypoint FastAPI)
```

### Criterio de separación

La organización sigue un criterio de **separación por dominio de negocio** combinado con **separación por responsabilidad arquitectónica**:

- **Por dominio**: `products/`, `carriers/`, `shipments/` — cada entidad core de TrackFlow tiene su propio módulo.
- **Por responsabilidad**: dentro de cada dominio, separamos `schemas` (contratos de datos), `services` (lógica), `repositories` (persistencia) y `models` (ORM). Esto sigue el principio de **Single Responsibility** y permite cambiar la implementación de una capa sin afectar las demás.

---

## 4. Organización de endpoints y routers FastAPI

Los routers se agrupan por **dominio de negocio**, siguiendo la convención de FastAPI de usar `APIRouter` con prefijos y tags, tal como se documenta en la guía oficial [Bigger Applications — Multiple Files](https://fastapi.tiangolo.com/tutorial/bigger-applications/).

### Estructura de rutas propuesta

```
/api/v1/
├── products/
│   ├── GET    /                         → Listar productos (con filtros: warehouse, status)
│   ├── GET    /{sku}                    → Obtener producto por SKU
│   ├── POST   /                         → Crear producto
│   ├── PUT    /{sku}                    → Actualizar producto
│   └── GET    /low-stock                → Alertas de stock bajo (KPI crítico)
│
├── carriers/
│   ├── GET    /                         → Listar transportistas
│   ├── GET    /{id}                     → Obtener transportista por ID
│   ├── POST   /                         → Crear transportista
│   ├── PUT    /{id}                     → Actualizar tarifas/capacidad
│   └── GET    /best-for-shipment/{id}   → Mejor transportista para un envío
│
├── shipments/
│   ├── GET    /                         → Listar envíos (con filtros: status, priority)
│   ├── GET    /{id}                     → Obtener envío por ID
│   ├── POST   /                         → Crear envío (asigna transportista automáticamente)
│   ├── PUT    /{id}/status              → Actualizar estado del envío
│   └── GET    /dashboard                → KPIs: distribución por estado, coste promedio
│
└── health/
    └── GET    /                         → Health check del servicio
```

### Criterios de agrupación

1. **Cada dominio tiene su propio archivo de router** (`products.py`, `carriers.py`, `shipments.py`), evitando un único archivo monolítico.
2. **Prefijo común**: `/api/v1` para versionado, permitiendo evolucionar la API sin romper clientes existentes.
3. **Tags por dominio**: cada router declara su tag (`"products"`, `"carriers"`, `"shipments"`), lo que genera documentación OpenAPI organizada automáticamente.
4. **Rutas específicas de negocio**: por ejemplo, `/products/low-stock` y `/carriers/best-for-shipment/{id}` reflejan necesidades reales de TrackFlow, no solo CRUD genérico.
5. **Dependencias compartidas**: se aplican a nivel de router (ej. autenticación para rutas protegidas) usando el parámetro `dependencies` de `APIRouter`.

---

## 5. Frontend y backend como sistemas separados

Actualmente, TrackFlow tiene website y backoffice como aplicaciones Next.js en un monorepo con npm workspaces, compartiendo `packages/logic`. Al introducir un backend Python/FastAPI, cambia la topología.

### Monorepo vs repositorios separados

**Decisión: Mantener monorepo.**

El proyecto ya es un monorepo (`jesteban1983-ai-engineering-company-project-monorepo`) con `uis/`, `packages/` y ahora `services/backend/`. Esto ofrece ventajas:

- **Un solo repositorio** para gestionar versiones, CI/CD y revisiones.
- **Visibilidad completa** del proyecto para todo el equipo.
- **Coherencia** entre frontend y backend en la misma rama.

**Riesgo a mitigar**: El monorepo puede crecer. Se recomienda que cada `services/` y `uis/` tenga su propio `pyproject.toml` o `package.json`, y que el CI ejecute solo los tests del área modificada.

### Comunicación API REST

- El frontend se comunica con el backend exclusivamente a través de la API REST en `/api/v1/*`.
- Las peticiones se hacen desde el navegador (website) o desde el servidor Next.js (backoffice) mediante `fetch` o `axios`.
- El backend no sirve HTML ni templates; solo devuelve JSON.

### CORS (Cross-Origin Resource Sharing)

Siguiendo la guía oficial de [CORS en FastAPI](https://fastapi.tiangolo.com/tutorial/cors/), se configura `CORSMiddleware` con:

```python
# app/main.py
from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost:3000",   # Website en desarrollo
    "http://localhost:3001",   # Backoffice en desarrollo
    "https://trackflow.com",   # Producción - website
    "https://admin.trackflow.com",  # Producción - backoffice
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Importante**: En producción, NO usar `allow_origins=["*"]` si se usan credenciales (cookies, tokens). Se deben listar explícitamente los orígenes permitidos.

### Variables de entorno

Siguiendo la guía de [Settings and Environment Variables de FastAPI](https://fastapi.tiangolo.com/advanced/settings/), se usa Pydantic `BaseSettings` para gestionar la configuración:

```python
# app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App
    app_name: str = "TrackFlow API"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    # Base de datos
    database_url: str = "sqlite:///./trackflow.db"

    # CORS
    allowed_origins: list[str] = ["http://localhost:3000"]

    # JWT
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 30

    class Config:
        env_file = ".env"

settings = Settings()
```

Las variables de entorno se definen en un archivo `.env` (nunca commiteado) con un `.env.example` como referencia para nuevos desarrolladores.

---

## 6. Riesgos y puntos de atención

### Riesgo 1: Lógica de negocio duplicada entre frontend y backend

**Problema**: Actualmente, la lógica de negocio de TrackFlow vive en `packages/logic` (TypeScript). Si el backend replica esas reglas en Python sin coordinación, ambas implementaciones divergirán con el tiempo.

**Mitigación**:
- Definir los contratos de datos (Pydantic schemas) como la fuente de verdad compartida, documentados en OpenAPI.
- Para reglas críticas (selección de transportistas, costeo), migrar la lógica al backend y que el frontend consuma los resultados vía API, eliminando la duplicación progresivamente.
- Implementar tests de integración que validen que ambos lados producen los mismos resultados para los mismos inputs.

### Riesgo 2: Routers hinchados con lógica de negocio

**Problema**: Es tentador poner lógica de negocio directamente dentro de las funciones de los routers (ej. calcular el mejor transportista dentro de `GET /carriers/best-for-shipment/{id}`). Esto rompe la separación por capas, hace el código difícil de testear y genera acoplamiento.

**Mitigación**:
- Los routers solo deben recibir la petición, validar parámetros, llamar al servicio correspondiente y devolver la respuesta.
- Toda lógica de negocio debe vivir en la capa `services/`.
- Establecer una política de código: "Si hay un `if` con lógica de negocio, no está en el lugar correcto". Esto se refuerza con code review.

### Riesgo 3: Deriva de configuración entre entornos

**Problema**: Sin una gestión disciplinada de variables de entorno, es fácil que el equipo use valores hardcodeados o que cada entorno (local, staging, producción) tenga configuraciones inconsistentes.

**Mitigación**:
- Usar `pydantic-settings` con validación de tipos en el arranque —si falta una variable crítica, la app no inicia.
- Mantener un `.env.example` actualizado en el repositorio.
- Documentar en el README del backend qué variables son necesarias y cómo obtener sus valores.

---

## 7. Referencias

- FastAPI — First Steps: https://fastapi.tiangolo.com/tutorial/first-steps/
- FastAPI — Bigger Applications (Multiple Files): https://fastapi.tiangolo.com/tutorial/bigger-applications/
- FastAPI — CORS (Cross-Origin Resource Sharing): https://fastapi.tiangolo.com/tutorial/cors/
- FastAPI — Settings and Environment Variables: https://fastapi.tiangolo.com/advanced/settings/
- TrackFlow Context — `CONTEXT.md` del monorepo
- 4Geeks Academy — Common Backend Architectures (ejercicio completado)