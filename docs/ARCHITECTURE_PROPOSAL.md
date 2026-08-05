# Propuesta de Arquitectura de Backend — Brasaland

> **Documento:** Versión 1.0  
> **Autor:** Brasaland Digital — Equipo de Ingeniería  
> **Propósito:** Definir la arquitectura del backend de Brasaland antes del inicio del desarrollo  
> **Audiencia:** CTO (Nicolás Park), equipo de ingeniería y stakeholders técnicos

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Patrón arquitectónico propuesto](#2-patrón-arquitectónico-propuesto)
3. [Estructura de carpetas y módulos](#3-estructura-de-carpetas-y-módulos)
4. [Organización de endpoints y routers](#4-organización-de-endpoints-y-routers)
5. [Separación frontend / backend](#5-separación-frontend--backend)
6. [Decisiones técnicas iniciales](#6-decisiones-técnicas-iniciales)
7. [Riesgos y puntos de atención](#7-riesgos-y-puntos-de-atención)

---

## 1. Resumen ejecutivo

Este documento describe la arquitectura propuesta para el backend de Brasaland, la cadena de restaurantes de 14 locales que opera en Colombia y Florida. El backend será el sistema central que unifique operaciones, procure datos de ventas, administre clientes, gestione inventarios y proveedores, y sirva como columna vertebral para todas las aplicaciones digitales de la empresa (sitio corporativo, app de fidelización, panel de operaciones, backoffice y tracker de talento).

La propuesta sigue un **modelo de monolito modular con separación por dominios**, implementado con **FastAPI** sobre **Python**. Esta elección equilibra la necesidad de velocidad de desarrollo inicial con la capacidad de evolucionar hacia microservicios si el negocio lo requiere.

---

## 2. Patrón arquitectónico propuesto

### Decisión: **Arquitectura en Capas con organización por Dominios (Domain-Driven Layered Architecture)**

Propongo una combinación de dos enfoques que se complementan:

#### 2.1 Arquitectura en Capas (Layered Architecture)

El backend se organiza en tres capas horizontales clásicas:

| Capa | Responsabilidad |
|------|----------------|
| **API / Router** | Recibe peticiones HTTP, delega en servicios, retorna respuestas. No contiene lógica de negocio. |
| **Service** | Orquesta lógica de negocio, aplica reglas, coordina repositorios. |
| **Repository / Data** | Accede a la base de datos y fuentes externas. Aísla el almacenamiento. |

**Por qué esta capa base:** FastAPI está diseñado para este patrón. La separación router → service → repository es la convención más extendida en la comunidad y la que recomienda la documentación oficial de FastAPI para aplicaciones grandes (mediante `APIRouter` y dependencias).

#### 2.2 Organización por Dominios (Domain-Driven Organization)

Dentro de cada capa, el código se agrupa por **dominio de negocio**, no por tipo técnico. Cada dominio refleja un área de la empresa:

- **locations** — gestión de restaurantes y locales
- **menu** — catálogo de productos y recetas
- **sales** — transacciones, pedidos, telemetría
- **inventory** — stock de ingredientes y suministros
- **procurement** — proveedores y órdenes de compra
- **customers** — CRM, perfiles, historial de clientes
- **loyalty** — programa de fidelización, puntos, canjes
- **hr** — empleados, turnos, nómina básica
- **training** — materiales de capacitación, recetas, actualizaciones
- **analytics** — reportes, dashboards, datos agregados

### 2.3 Justificación: ¿Por qué esta combinación para Brasaland?

| Característica de Brasaland | Implicación arquitectónica |
|----------------------------|---------------------------|
| 14 locales en 2 países con operaciones similares | Un monolito modular evita la sobreingeniería inicial. No necesitamos desplegar 10 servicios independientes desde el día 1. |
| Equipo pequeño (Brasaland Digital) | Menos overhead operativo: un solo repositorio, un solo despliegue, dependencias compartidas. |
| Dominios bien diferenciados (operaciones, compras, clientes, RRHH) | La separación por dominios permite que distintos miembros del equipo trabajen en paralelo sin pisarse. |
| Crecimiento esperado (nuevos locales, nuevos productos) | La modularidad por dominios facilita extraer un microservicio en el futuro si un dominio crece lo suficiente. |
| Múltiples frontends (app, backoffice, web, operaciones) | Una API unificada con routers por dominio sirve a todos los clientes desde un mismo punto. |
| Necesidad de datos en tiempo real (ventas del día, stock crítico) | FastAPI es async nativo, ideal para endpoints de consulta rápida y WebSockets. |

### 2.4 ¿Por qué no otras opciones?

| Patrón | Motivo de descarte |
|--------|-------------------|
| **Microservicios puros** | Overhead operativo injustificable para un equipo pequeño. La deuda de coordinación entre servicios (contratos, despliegues, monitoreo) supera el beneficio en esta etapa. |
| **Serverless (AWS Lambda, etc.)** | Bueno para funciones específicas (ej. enviar emails), pero no para un sistema transaccional con estado y operaciones complejas. El cold start y las limitaciones de conexiones a base de datos serían un problema. |
| **MVC tradicional (Model-View-Controller)** | En una API REST no hay "vista" que renderizar. Las capas Service/Repository encajan mejor que la tríada MVC pensada para aplicaciones web con interfaz. |
| **Hexagonal / Puertos y Adaptadores** | Excelente para testabilidad, pero introduce una indirección (interfaces/adaptadores) que añade complejidad temprana. Podemos adoptarlo de forma gradual en dominios críticos como **inventory** o **sales**. |

---

## 3. Estructura de carpetas y módulos

### 3.1 Estructura propuesta

La estructura sigue la convención estándar de FastAPI para proyectos grandes, adaptada a los dominios de Brasaland:

```
services/backend/
├── pyproject.toml              # Dependencias y configuración del proyecto
├── alembic.ini                 # Configuración de migraciones (Alembic)
├── Dockerfile                  # Imagen de producción
├── docker-compose.yml          # Entorno local con base de datos
├── .env.example                # Variables de entorno de referencia
│
├── app/
│   ├── __init__.py
│   ├── main.py                 # Punto de entrada: monta routers, middlewares, lifespan
│   ├── config.py               # Configuración central (pydantic-settings)
│   ├── database.py             # Configuración de base de datos (SQLAlchemy async)
│   │
│   ├── common/                 # Código compartido entre todos los dominios
│   │   ├── __init__.py
│   │   ├── base.py             # Modelo base SQLAlchemy (declarative base)
│   │   ├── deps.py             # Dependencias reutilizables (db session, auth)
│   │   ├── exceptions.py       # Excepciones personalizadas y handlers
│   │   ├── schemas.py          # Schemas genéricos (paginación, respuestas envelope)
│   │   └── utils.py            # Utilidades transversales (monedas, fechas)
│   │
│   ├── domains/                # ← Núcleo: un subdirectorio por dominio
│   │   │
│   │   ├── locations/          # 🏪 Locales y su configuración
│   │   │   ├── __init__.py
│   │   │   ├── router.py       # Endpoints: /api/v1/locations
│   │   │   ├── schemas.py      # Pydantic models (request/response)
│   │   │   ├── service.py      # Lógica de negocio
│   │   │   ├── repository.py   # Acceso a datos
│   │   │   └── models.py       # Modelos SQLAlchemy
│   │   │
│   │   ├── menu/               # 📋 Menús, productos, recetas
│   │   │   ├── __init__.py
│   │   │   ├── router.py
│   │   │   ├── schemas.py
│   │   │   ├── service.py
│   │   │   ├── repository.py
│   │   │   └── models.py
│   │   │
│   │   ├── sales/              # 💰 Ventas, pedidos, transacciones
│   │   │   ├── __init__.py
│   │   │   ├── router.py
│   │   │   ├── schemas.py
│   │   │   ├── service.py
│   │   │   ├── repository.py
│   │   │   └── models.py
│   │   │
│   │   ├── inventory/          # 📦 Stock de ingredientes por local
│   │   │   ├── __init__.py
│   │   │   ├── router.py
│   │   │   ├── schemas.py
│   │   │   ├── service.py
│   │   │   ├── repository.py
│   │   │   └── models.py
│   │   │
│   │   ├── procurement/        # 🛒 Proveedores y órdenes de compra
│   │   │   ├── __init__.py
│   │   │   ├── router.py
│   │   │   ├── schemas.py
│   │   │   ├── service.py
│   │   │   ├── repository.py
│   │   │   └── models.py
│   │   │
│   │   ├── customers/          # 👥 CRM, perfiles, segmentos
│   │   │   ├── __init__.py
│   │   │   ├── router.py
│   │   │   ├── schemas.py
│   │   │   ├── service.py
│   │   │   ├── repository.py
│   │   │   └── models.py
│   │   │
│   │   ├── loyalty/            # 🎯 Puntos, canjes, promociones
│   │   │   ├── __init__.py
│   │   │   ├── router.py
│   │   │   ├── schemas.py
│   │   │   ├── service.py
│   │   │   ├── repository.py
│   │   │   └── models.py
│   │   │
│   │   ├── hr/                 # 🧑‍🤝‍🧑 Empleados, turnos, ausencias
│   │   │   ├── __init__.py
│   │   │   ├── router.py
│   │   │   ├── schemas.py
│   │   │   ├── service.py
│   │   │   ├── repository.py
│   │   │   └── models.py
│   │   │
│   │   ├── training/           # 🎓 Recetarios, materiales, versiones
│   │   │   ├── __init__.py
│   │   │   ├── router.py
│   │   │   ├── schemas.py
│   │   │   ├── service.py
│   │   │   ├── repository.py
│   │   │   └── models.py
│   │   │
│   │   └── analytics/          # 📊 Reportes y agregaciones
│   │       ├── __init__.py
│   │       ├── router.py
│   │       ├── schemas.py
│   │       ├── service.py
│   │       └── repository.py   # Consultas de solo lectura / materializadas
│   │
│   ├── integrations/           # Integraciones con sistemas externos
│   │   ├── __init__.py
│   │   ├── pos/                # Adaptadores para POS (Colombia y Florida)
│   │   ├── payments/           # Pasarelas de pago
│   │   ├── whatsapp/           # API de WhatsApp Business
│   │   └── email/              # Proveedor de email transaccional
│   │
│   └── core/                   # Configuración transversal del framework
│       ├── __init__.py
│       ├── auth.py             # Autenticación JWT, roles, permisos
│       ├── cache.py            # Cliente de Redis / caché
│       ├── cors.py             # Configuración CORS
│       └── middlewares.py      # Middlewares personalizados
│
├── tests/
│   ├── conftest.py             # Fixtures globales (DB de prueba, cliente HTTP)
│   ├── test_locations/
│   ├── test_menu/
│   ├── test_sales/
│   ├── test_inventory/
│   ├── test_procurement/
│   ├── test_customers/
│   ├── test_loyalty/
│   ├── test_hr/
│   ├── test_training/
│   └── test_analytics/
│
└── alembic/
    └── versions/               # Migraciones de base de datos
```

### 3.2 Criterio de separación

Cada dominio contiene **todo lo que necesita para funcionar**: sus modelos, sus endpoints, su lógica de negocio y su acceso a datos. Esto se conoce como **cohesión vertical por dominio**.

**Ventajas de este criterio:**
- **Descubribilidad:** Un desarrollador sabe exactamente dónde buscar la lógica de "clientes": está en `domains/customers/`.
- **Aislamiento:** Los cambios en un dominio raramente afectan a otros.
- **Evolución:** Si el dominio `loyalty` crece lo suficiente, moverlo a un microservicio independiente implica copiar una carpeta y añadir un router externo.
- **Paralelismo:** Dos desarrolladores pueden trabajar simultáneamente en `procurement` y `loyalty` sin conflictos de merge.

### 3.3 ¿Qué NO va dentro de `domains/`?

- **Integraciones externas** (`integrations/`) — Los adaptadores POS, pasarelas de pago y APIs de terceros se mantienen separados. Los dominios los consumen mediante interfaces (inyección de dependencias), no los importan directamente.
- **Configuración del framework** (`core/`) — Auth, CORS, caché y middlewares aplican a toda la aplicación y no pertenecen a ningún dominio.
- **Código compartido** (`common/`) — Bases abstractas, schemas genéricos y utilidades transversales.

---

## 4. Organización de endpoints y routers

### 4.1 Versionado

Todas las rutas llevan el prefijo `/api/v1/`. Esto permite introducir cambios rompientes en el futuro sin afectar a los clientes existentes.

### 4.2 Rutas propuestas por dominio

Cada dominio expone su propio `APIRouter` con un prefijo y tags específicos. A continuación, la organización propuesta:

| Dominio | Prefijo | Ejemplos de endpoints |
|---------|---------|----------------------|
| **Locations** | `/api/v1/locations` | `GET /` — listar locales; `GET /{id}` — detalle; `PATCH /{id}` — actualizar configuración; `GET /{id}/telemetry` — métricas en vivo |
| **Menu** | `/api/v1/menu` | `GET /` — catálogo; `GET /{product_id}` — detalle; `GET /{product_id}/ingredients` — receta con ingredientes |
| **Sales** | `/api/v1/sales` | `GET /` — ventas (filtro por local, fecha); `POST /` — registrar venta; `GET /daily-summary` — resumen diario; `GET /{location_id}/live` — ventas en vivo (vía WebSocket) |
| **Inventory** | `/api/v1/inventory` | `GET /{location_id}` — stock actual; `POST /adjust` — ajuste manual; `GET /alerts` — ingredientes por debajo del umbral; `POST /calculate-order` — orden sugerida por IA |
| **Procurement** | `/api/v1/procurement` | `GET /suppliers` — listar proveedores; `POST /orders` — crear orden; `GET /orders/{id}` — seguimiento; `GET /orders/consolidated` — consolidado para Lucía |
| **Customers** | `/api/v1/customers` | `GET /` — buscar clientes; `POST /` — registrar; `GET /{id}` — perfil completo; `GET /{id}/orders` — historial |
| **Loyalty** | `/api/v1/loyalty` | `GET /{customer_id}/points` — saldo; `POST /redeem` — canjear puntos; `GET /promotions` — promociones activas; `POST /promotions/trigger` — disparar promoción personalizada |
| **HR** | `/api/v1/hr` | `GET /employees` — listar empleados; `POST /shifts` — asignar turno; `GET /absence-requests` — solicitudes de ausencia; `GET /kpi` — indicadores de RRHH |
| **Training** | `/api/v1/training` | `GET /recipes` — recetario; `GET /recipes/{id}` — detalle; `POST /recipes/{id}/versions` — nueva versión; `GET /materials` — materiales de capacitación |
| **Analytics** | `/api/v1/analytics` | `GET /dashboard/executive` — dashboard ejecutivo; `GET /dashboard/operations` — dashboard de operaciones; `GET /reports/weekly` — reporte semanal automatizado |

### 4.3 Criterio de agrupación

Los endpoints se agrupan por **sustantivo de dominio** (no por verbo o acción). Esto sigue el principio REST y hace que la API sea predecible:

- Cada dominio tiene su propio `router.py` con un `APIRouter(prefix=..., tags=[...])`.
- Los endpoints dentro de un router se organizan por recurso: `GET /`, `POST /`, `GET /{id}`, `PATCH /{id}`, `DELETE /{id}`.
- Las operaciones que no encajan en CRUD estándar se nombran con un verbo en la ruta: `/calculate-order`, `/daily-summary`, `/trigger`.

### 4.4 WebSockets

Algunos dominios necesitan comunicación en tiempo real:
- **Sales** → WebSocket en `/ws/v1/sales/{location_id}` para telemetría de ventas en vivo.
- **Inventory** → WebSocket en `/ws/v1/inventory/{location_id}/alerts` para alertas de stock crítico.

Los WebSockets se manejan en routers separados dentro del mismo dominio para no mezclar lógica REST con tiempo real.

---

## 5. Separación frontend / backend

### 5.1 Modelo actual: monorepo con frontends separados

El proyecto actual ya es un monorepo (npm workspaces) que contiene:
- `uis/website/` — Sitio corporativo (Next.js)
- `uis/backoffice/` — Backoffice administrativo (Next.js)
- `uis/loyalty-app/` — App de fidelización (Next.js)
- `uis/operations-ui/` — Panel de operaciones (Next.js)
- `uis/talent-pipeline-tracker/` — Tracker de talento (Next.js)

**Propuesta:** El backend vivirá dentro del mismo monorepo, en `services/backend/`, siguiendo la estructura de carpetas descrita en la sección 3.

### 5.2 Comunicación por API

| Aspecto | Decisión |
|---------|----------|
| **Protocolo** | HTTP/1.1 + WebSocket. En el futuro, gRPC para comunicación interna si hay microservicios. |
| **Formato** | JSON. FastAPI lo maneja nativamente con Pydantic. |
| **Autenticación** | JWT (access token + refresh token). Los tokens se obtienen mediante `POST /api/v1/auth/login` y se envían como `Authorization: Bearer <token>`. |
| **Documentación** | OpenAPI generada automáticamente por FastAPI en `/docs` (Swagger UI) y `/redoc` (ReDoc). |

### 5.3 Variables de entorno compartidas

Tanto frontends como backend necesitan conocer ciertos valores. Se gestionarán con un archivo `.env` en la raíz del monorepo:

```bash
# Backend
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/brasaland
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=...
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002

# Común (leen tanto backend como frontends)
API_BASE_URL=http://localhost:8000/api/v1
CURRENCY_BASE=USD
DEFAULT_LOCALE=es-CO
```

### 5.4 CORS

FastAPI requiere configurar CORS explícitamente para aceptar peticiones desde los frontends. La configuración leerá `CORS_ORIGINS` del entorno:

```python
# app/core/cors.py
origins = os.getenv("CORS_ORIGINS", "").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Importante:** En producción, `CORS_ORIGINS` debe listar solo los dominios específicos de los frontends desplegados (no usar `["*"]`).

### 5.5 Estrategia de monorepo

| Aspecto | Decisión |
|---------|----------|
| **Repositorio** | Un único repositorio (monorepo) para todo el proyecto. Ya es la estructura actual. |
| **Backend** | En `services/backend/`, con su propio `pyproject.toml` y dependencias Python. |
| **Frontends** | En `uis/*/`, cada uno con su `package.json` y dependencias Node. |
| **CI/CD** | Un pipeline que detecta cambios en `services/backend/` o `uis/*/` y despliega solo lo modificado. |
| **Ventajas** | Vista unificada del sistema, configuración compartida (`.env` raíz), coordinación más fácil entre equipos. |
| **Riesgo** | El monorepo puede crecer en tamaño. Se mitiga con `docker-compose` para desarrollo local y builds selectivos. |

---

## 6. Decisiones técnicas iniciales

| Decisión | Opción elegida | Justificación |
|----------|---------------|---------------|
| **Framework web** | FastAPI | Async nativo, tipado con Pydantic, documentación OpenAPI automática, rendimiento excelente. |
| **Lenguaje** | Python 3.12+ | Tipado moderno, ecosistema maduro para datos (pandas, SQLAlchemy), facilidad de contratación. |
| **Base de datos** | PostgreSQL 16 | Relacional, maduro, soporte nativo de JSON, ideal para datos estructurados de restaurantes. |
| **ORM** | SQLAlchemy 2.0 (async) | Estándar de facto en Python, async session, modelo declarativo, migraciones con Alembic. |
| **Migraciones** | Alembic | Integración directa con SQLAlchemy, control de versiones de esquema. |
| **Validación** | Pydantic v2 | Integrado en FastAPI, rendimiento excelente (Rust-based), schemas anidados. |
| **Autenticación** | JWT (python-jose + passlib) | Stateless, adecuado para API REST, compatible con múltiples frontends. |
| **Cache** | Redis | En memoria, rápido, soporte de pub/sub para notificaciones en tiempo real. |
| **Testing** | pytest + httpx + pytest-asyncio | Estándar en el ecosistema Python, TestClient asíncrono para FastAPI. |
| **Contenedores** | Docker + docker-compose | Entorno reproducible, mismo stack en dev, staging y producción. |
| **Entorno** | Python venv + pyproject.toml | Gestión de dependencias moderna (PEP 621), sin necesidad de Poetry/Poetry. |

---

## 7. Riesgos y puntos de atención

### Riesgo 1: Acoplamiento entre dominios

**Problema:** Aunque los dominios están separados en carpetas, existe el riesgo de que un dominio importe modelos o servicios de otro dominio directamente, creando un acoplamiento silencioso.

**Ejemplo concreto:** El dominio `inventory` necesita saber qué ingredientes consume cada producto del menú. Si `inventory/repository.py` importa `menu/models.py` directamente, cualquier cambio en el modelo `Product` de `menu` puede romper `inventory`.

**Mitigación:**
- Cada dominio debe comunicarse con otros dominios **solamente a través de su servicio público (service layer)**, nunca importando modelos o repositorios ajenos.
- Establecer una convención desde el día 1: si el dominio A necesita datos del dominio B, debe hacerlo mediante `B_service.get_necessary_data()`, no mediante `from domains.B.models import X`.
- En code review, vigilar específicamente los imports entre dominios.

### Riesgo 2: Crecimiento desordenado de `common/`

**Problema:** El directorio `common/` puede convertirse en un cajón de sastre donde el equipo empiece a meter "cositas útiles" sin criterio, terminando con un módulo enorme y sin cohesión.

**Ejemplo concreto:** Funciones de formateo de moneda, constantes de país, helpers de fecha, schemas genéricos, utilidades de string — todo mezclado en un solo archivo `utils.py`.

**Mitigación:**
- Definir submódulos con responsabilidad clara: `common/schemas.py` (solo schemas reutilizables), `common/currency.py` (todo lo relacionado con COP/USD), `common/exceptions.py` (excepciones personalizadas).
- Regla de equipo: si un archivo en `common/` supera las 200 líneas, hay que refactorizarlo en submódulos.
- Preferir duplicación ligera sobre dependencia innecesaria: a veces es mejor que dos dominios definan su propio schema similar a compartir uno genérico que arrastra dependencias no deseadas.

### Riesgo 3: Ausencia de estándar para modelos Pydantic vs SQLAlchemy

**Problema:** Puede haber confusión entre los modelos de base de datos (SQLAlchemy) y los schemas de la API (Pydantic). Sin una convención clara, algunos endpoints podrían exponer campos internos de la base de datos o, peor aún, recibir datos que no corresponden al modelo de negocio.

**Mitigación:**
- Convención: `models.py` → SQLAlchemy (base de datos), `schemas.py` → Pydantic (API).
- Nunca exponer un modelo SQLAlchemy directamente como respuesta de un endpoint. Siempre convertir a Pydantic schema.
- Usar `from_attributes=True` en los schemas Pydantic para facilitar la conversión ORM → schema.

### Riesgo 4: Monolito que se vuelve inmantenible

**Problema:** Aunque empezamos con un monolito modular, si el equipo no respeta los límites entre dominios, el monolito puede convertirse en un "gran bola de barro" donde todo depende de todo.

**Mitigación:**
- Las pruebas de integración deben verificar que los dominios se comunican solo a través de servicios.
- Si un dominio supera cierto tamaño (ej. 10+ tablas, 20+ endpoints), considerar seriamente extraerlo como microservicio.
- Mantener un mapa visual de dependencias entre dominios y revisarlo cada sprint.

### Riesgo 5: Gestión de dos monedas y dos sistemas POS

**Problema:** Brasaland opera en COP (Colombia) y USD (Florida). Además, cada país usa un sistema POS diferente. Esta complejidad puede filtrarse por todo el código si no se contiene desde el principio.

**Mitigación:**
- Centralizar toda la lógica de conversión y moneda en `common/currency.py`.
- Los adaptadores POS en `integrations/pos/` deben normalizar los datos a un formato común antes de que lleguen a los dominios.
- Almacenar siempre los montos en USD como base y guardar la moneda original como metadato (evitar conversiones bidireccionales que pierden precisión).

---

## Apéndice A: Glosario

| Término | Significado |
|---------|-------------|
| **Dominio** | Área de negocio con sus propios datos, reglas y operaciones (ej. Loyalty, Inventory). |
| **Monolito modular** | Aplicación desplegada como una sola unidad, pero con código organizado en módulos con límites claros. |
| **APIRouter** | Mecanismo de FastAPI para agrupar endpoints relacionados bajo un prefijo y tags comunes. |
| **Schema (Pydantic)** | Modelo de datos para validación de entrada y serialización de salida en la API. |
| **Service Layer** | Capa de lógica de negocio entre los routers y los repositorios. |
| **Repository** | Abstracción de acceso a datos que aísla al servicio de la tecnología de almacenamiento. |

---

## Apéndice B: Flujo de desarrollo recomendado

1. El equipo define el schema de datos (Pydantic + SQLAlchemy) de un dominio.
2. Se genera la migración con Alembic.
3. Se implementa el repositorio (acceso a datos).
4. Se implementa el servicio (lógica de negocio).
5. Se exponen los endpoints en el router.
6. Se escriben pruebas por cada capa.
7. Se integra en `main.py` mediante `app.include_router()`.
8. Se documenta en el OpenAPI generado automáticamente.

Este orden garantiza que cada capa tenga sentido antes de exponerla al mundo exterior.

---

*Documento interno — Brasaland Digital*  
*Versión 1.0 — Preparado para el inicio del Sprint 5*