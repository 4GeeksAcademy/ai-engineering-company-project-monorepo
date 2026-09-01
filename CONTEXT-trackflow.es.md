# CONTEXT — Directorio de Proveedores · TrackFlow

_These instructions are also available in [English](./CONTEXT-trackflow.en.md)._

> **Milestone:** 09 — Lightweight Storage API  
> **Ruta en el repositorio:** `09-lightweight-storage/CONTEXT-trackflow.md`

---

## Tu empresa

Eres parte del equipo **TrackFlow Tech**, la unidad tecnológica interna de TrackFlow, una empresa de logística de última milla y gestión de almacenes con operaciones en **Los Ángeles (USA) y Zaragoza (España)**. Tu tech lead es **Andrés Kim**, CTO, y el proyecto ha sido solicitado por **Carlos Vega**, Head of Carrier Operations, con el respaldo de **Ana Whitfield**, Head of Warehouse Operations.

TrackFlow trabaja con una red de proveedores que incluye carriers, suministros de almacén, embalaje y software operacional. Cada país negocia con sus propios proveedores y gestiona los contratos de forma independiente. El resultado es que ni Carlos ni Ana tienen visibilidad del directorio completo — cada uno lleva su propia hoja de cálculo. Este proyecto crea el registro centralizado que unifica ambos mercados.

---

## Modelo de proveedor

Cada proveedor en el directorio de TrackFlow tiene la siguiente estructura:

| Campo               | Tipo                                  | Descripción                                                             |
| ------------------- | ------------------------------------- | ----------------------------------------------------------------------- |
| `name`              | string, requerido                     | Nombre comercial del proveedor                                          |
| `country`           | string, requerido                     | País del contrato: `"USA"` o `"Spain"`                                  |
| `categories`        | lista de strings, requerido, mínimo 1 | Tipo de servicio o producto que provee (ver lista válida)               |
| `rate_per_shipment` | float, requerido, > 0                 | Tarifa vigente por envío o unidad de servicio en la moneda del contrato |
| `currency`          | string, requerido                     | `"USD"` para USA, `"EUR"` para Spain                                    |
| `updated_at`        | datetime, generado por el sistema     | Timestamp de la última actualización de tarifa                          |
| `status`            | string, requerido                     | `"active"` o `"suspended"`                                              |
| `service_zone`      | string, opcional                      | Zona de cobertura del proveedor (ej. `"West Coast"`, `"Aragón"`)        |
| `contact_email`     | string, opcional                      | Email de contacto del proveedor                                         |
| `notes`             | string, opcional                      | Observaciones del equipo de operaciones                                 |

### Categorías válidas

```python
VALID_CATEGORIES = [
    "carrier_last_mile",
    "carrier_international",
    "warehouse_supplies",
    "packaging_materials",
    "reverse_logistics",
    "fleet_maintenance",
    "it_and_wms_software",
    "cleaning_and_facilities"
]
```

### Estados válidos

```python
VALID_STATUSES = ["active", "suspended"]
```

---

## Datos iniciales del seeder

El seeder debe cargar exactamente los siguientes proveedores, que representan el directorio actual de Carlos y Ana combinado.

```python
SUPPLIERS_SEED = [
    {
        "name": "UPS Ground",
        "country": "USA",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 7.45,
        "currency": "USD",
        "status": "active",
        "service_zone": "West Coast",
        "contact_email": "business@ups.com",
        "notes": "Carrier principal para entregas locales en Los Ángeles y alrededores."
    },
    {
        "name": "FedEx Ground",
        "country": "USA",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 7.90,
        "currency": "USD",
        "status": "active",
        "service_zone": "Continental USA",
        "contact_email": "business.solutions@fedex.com"
    },
    {
        "name": "DHL Express USA",
        "country": "USA",
        "categories": ["carrier_last_mile", "carrier_international"],
        "rate_per_shipment": 14.20,
        "currency": "USD",
        "status": "active",
        "service_zone": "Continental USA + International",
        "contact_email": "business.us@dhl.com",
        "notes": "Usado para envíos urgentes y exportaciones a Europa."
    },
    {
        "name": "OnTrac",
        "country": "USA",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 6.10,
        "currency": "USD",
        "status": "active",
        "service_zone": "West Coast",
        "contact_email": "solutions@ontrac.com",
        "notes": "Carrier regional. Mejor tarifa en la zona de Los Ángeles."
    },
    {
        "name": "Laser Ship",
        "country": "USA",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 5.80,
        "currency": "USD",
        "status": "suspended",
        "service_zone": "East Coast",
        "contact_email": "business@lasership.com",
        "notes": "Suspendido. Tasa de incidencias superior al 8% en Q3."
    },
    {
        "name": "PackSource LA",
        "country": "USA",
        "categories": ["packaging_materials"],
        "rate_per_shipment": 0.42,
        "currency": "USD",
        "status": "active",
        "contact_email": "orders@packsource.com",
        "notes": "Cajas, relleno y precinto para el almacén de Los Ángeles."
    },
    {
        "name": "CleanTeam West",
        "country": "USA",
        "categories": ["cleaning_and_facilities"],
        "rate_per_shipment": 1800.0,
        "currency": "USD",
        "status": "active",
        "contact_email": "accounts@cleanteamwest.com",
        "notes": "Tarifa mensual por servicio de limpieza del almacén de LA."
    },
    {
        "name": "MRW España",
        "country": "Spain",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 4.90,
        "currency": "EUR",
        "status": "active",
        "service_zone": "Península Ibérica",
        "contact_email": "clientes.empresa@mrw.es",
        "notes": "Carrier principal para entregas en España. Contrato negociado por volumen."
    },
    {
        "name": "SEUR",
        "country": "Spain",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 5.20,
        "currency": "EUR",
        "status": "active",
        "service_zone": "Península Ibérica + Baleares",
        "contact_email": "grandes.cuentas@seur.com"
    },
    {
        "name": "DHL Express España",
        "country": "Spain",
        "categories": ["carrier_last_mile", "carrier_international"],
        "rate_per_shipment": 12.80,
        "currency": "EUR",
        "status": "active",
        "service_zone": "España + Internacional",
        "contact_email": "business.es@dhl.com",
        "notes": "Envíos urgentes y exportaciones desde Zaragoza."
    },
    {
        "name": "Nacex",
        "country": "Spain",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 4.60,
        "currency": "EUR",
        "status": "active",
        "service_zone": "Aragón y zona norte",
        "contact_email": "empresas@nacex.es",
        "notes": "Carrier regional con buena cobertura en Aragón."
    },
    {
        "name": "Logística Inversa Iberia",
        "country": "Spain",
        "categories": ["reverse_logistics"],
        "rate_per_shipment": 6.30,
        "currency": "EUR",
        "status": "active",
        "contact_email": "operaciones@liiberia.es",
        "notes": "Gestión de devoluciones para el almacén de Zaragoza."
    },
    {
        "name": "Embalajes Zaragoza S.L.",
        "country": "Spain",
        "categories": ["packaging_materials"],
        "rate_per_shipment": 0.28,
        "currency": "EUR",
        "status": "active",
        "contact_email": "pedidos@embalajeszgz.es"
    },
    {
        "name": "SAP WM Cloud",
        "country": "USA",
        "categories": ["it_and_wms_software"],
        "rate_per_shipment": 2200.0,
        "currency": "USD",
        "status": "suspended",
        "contact_email": "enterprise@sap.com",
        "notes": "Suspendido. Andrés está evaluando alternativas más ligeras para el almacén de LA."
    },
    {
        "name": "ReturnBear",
        "country": "USA",
        "categories": ["reverse_logistics"],
        "rate_per_shipment": 4.15,
        "currency": "USD",
        "status": "active",
        "service_zone": "West Coast",
        "contact_email": "partnerships@returnbear.com",
        "notes": "Gestión de devoluciones para clientes de Los Ángeles."
    }
]
```

---

## Restricciones de negocio

- **Moneda por país:** Un proveedor de `"USA"` debe tener `currency = "USD"`. Un proveedor de `"Spain"` debe tener `currency = "EUR"`. La API rechaza combinaciones inconsistentes.
- **Trazabilidad de tarifas:** Cada actualización de `rate_per_shipment` debe registrar `updated_at` automáticamente. Carlos usa este histórico para revisar la evolución de costes por carrier.
- **Suspensión por incidencias:** El flujo habitual en TrackFlow es suspender proveedores con alta tasa de incidencias, no eliminarlos. El historial de suspensiones es información operativa relevante.
- **Carriers con doble categoría:** Es válido que un carrier opere tanto en última milla como en internacional (como DHL). El campo `categories` admite múltiples valores simultáneamente.

---

## Lo que verá Carlos en el frontend

La página del directorio debe permitirle a Carlos:

1. Ver todos los proveedores con sus categorías, tarifa y estado de un vistazo.
2. Filtrar por país (USA / Spain) para gestionar cada mercado por separado.
3. Filtrar por categoría para responder preguntas como "¿qué carriers activos tenemos en España?".
4. Registrar un proveedor nuevo desde un formulario.
5. Actualizar la tarifa por envío de un proveedor y ver el cambio reflejado de inmediato.
6. Suspender o reactivar un proveedor con un control visible en la fila.

---

_Documento interno — 4Geeks Academy · AI Engineering Track_
