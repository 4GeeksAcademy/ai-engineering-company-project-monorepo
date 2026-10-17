# CONTEXT — Hito 5: Gestión de Inventario Backend
## Empresa: Nexova

**Ruta:** `05-backend-inventory-orm/CONTEXT-nexova.es.md`

---

## Tu Empresa

**Nexova** es una consultora de recursos humanos y adquisición de talento con 120 empleados entre Valencia (España) y Miami (EE.UU.). Sus tres líneas de negocio — headhunting ejecutivo, externalización de atención al cliente y formación corporativa — dependen de que los equipos tecnológicos estén correctamente asignados a las personas adecuadas en el momento preciso.

Con 6 oficinas, 30 agentes de soporte externalizados y ciclos de contratación constantes, el equipo de IT y operaciones de Nexova no tiene visibilidad sobre qué hardware y material hay en stock, quién ha recibido qué, ni qué se ha consumido. Los portátiles desaparecen. Los equipos se asignan por duplicado. Los materiales de oficina se agotan sin previo aviso.

**Sergio Molina (CTO)** ha asignado este hito a tu equipo como parte de la construcción de la plataforma Nexova.

> **De Sergio (CTO) — Ticket Jira NXV-0201:**
> "Necesitamos una API de inventario de equipos y materiales. Una 'entrada de activos' es una compra o entrega recibida por la empresa. Una 'salida de activos' es una asignación a un empleado o un evento de consumo. El stock siempre es el resultado neto de entradas menos salidas — no se puede establecer directamente. Todas las rutas bajo `/inventory`. Consultad la especificación de entidades. Usad el UUID del usuario de TinyDB en cada orden."

---

## Nombres de Entidades y Especificación de Campos

Usa estos nombres exactamente en tus modelos, schemas y respuestas de la API.

### `Asset` (equivale a `Product` del README)

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | `int` (PK) | Autoincremental |
| `name` | `str` | Ej.: `"Portátil 14\" Business"`, `"Ratón ergonómico"`, `"Resma de papel A4"` |
| `sku` | `str` | Código único, ej.: `"NXV-IT-001"`, `"NXV-OFF-003"` |
| `category` | `str` | `"hardware"`, `"peripherals"`, `"office_supplies"`, `"training_materials"` |
| `office` | `str` | `"Valencia"` o `"Miami"` |
| `current_stock` | `int` | **Campo calculado — no almacenado.** Derivado de las órdenes. Incluir solo en el schema de respuesta. |

### `AssetEntry` (equivale a `InboundOrder` del README)

Una compra o entrega de proveedor recibida por Nexova.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | `int` (PK) | Autoincremental |
| `asset_id` | `int` (FK → Asset) | |
| `quantity` | `int` | Unidades recibidas |
| `supplier` | `str` | Nombre del proveedor o vendedor |
| `office` | `str` | `"Valencia"` o `"Miami"` — oficina receptora |
| `created_at` | `datetime` | Se establece automáticamente al crear |
| `user_uuid` | `str` | UUID del responsable de IT/operaciones que registró la entrada (de TinyDB) |

### `AssetExit` (equivale a `OutboundOrder` del README)

Una asignación de activo a un empleado o un evento de consumo.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | `int` (PK) | Autoincremental |
| `asset_id` | `int` (FK → Asset) | |
| `quantity` | `int` | Unidades asignadas o consumidas |
| `exit_type` | `str` | `"allocation"` (asignado a empleado) o `"consumption"` (consumido, p. ej., papel) |
| `assigned_to` | `str \| None` | Nombre o ID del empleado si `exit_type = "allocation"`. Nulo para consumos. |
| `office` | `str` | `"Valencia"` o `"Miami"` |
| `created_at` | `datetime` | Se establece automáticamente al crear |
| `user_uuid` | `str` | UUID del responsable que registró la salida (de TinyDB) |

---

## Router de la API

Todos los endpoints deben registrarse bajo el prefijo `/inventory`. El archivo del router se encuentra en `services/routers/inventory.py`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/inventory/products` | Lista todos los activos con `current_stock` |
| `POST` | `/inventory/products` | Registra un nuevo activo |
| `GET` | `/inventory/products/{id}` | Obtiene un activo con su stock actual |
| `POST` | `/inventory/orders/inbound` | Registra una entrega de activos (`AssetEntry`) |
| `POST` | `/inventory/orders/outbound` | Registra una asignación o consumo (`AssetExit`) |
| `GET` | `/inventory/orders` | Lista todas las entradas y salidas con datos del activo |

---

## Reglas de Negocio

1. **`current_stock` siempre se calcula**, nunca se almacena. Para cualquier activo: `current_stock = SUMA(AssetEntry.quantity) − SUMA(AssetExit.quantity)`.
2. **No se puede procesar una salida si superaría el stock disponible.** Devuelve `HTTP 400` con el mensaje: `"Insufficient stock for asset '{name}'. Available: {available}, requested: {quantity}."`. Rechazar antes de escribir.
3. **`assigned_to` es obligatorio cuando `exit_type = "allocation"` y debe ser nulo cuando `exit_type = "consumption"`**. Validar en el schema de request o en la lógica de la ruta.
4. **Sin tabla de usuarios en Supabase.** Los campos `user_uuid` referencian usuarios de TinyDB. No crear un modelo User en SQLModel.
5. **Ambas oficinas coexisten en las mismas tablas.** Usa el campo `office` para filtrar por ubicación cuando sea necesario.

---

## Datos Semilla

Crea los siguientes registros al configurar tu base de datos de desarrollo local.

### Assets (mínimo 6)

| name | sku | category | office |
|------|-----|----------|--------|
| Portátil 14" Business | NXV-IT-001 | hardware | Valencia |
| Portátil 14" Business | NXV-IT-002 | hardware | Miami |
| Ratón ergonómico | NXV-PER-001 | peripherals | Valencia |
| Hub USB-C | NXV-PER-002 | peripherals | Miami |
| Resma de papel A4 | NXV-OFF-001 | office_supplies | Valencia |
| Cuaderno de formación en liderazgo | NXV-TRN-001 | training_materials | Valencia |

### AssetEntries (mínimo 4)

Registra al menos 2 entregas para `NXV-IT-001` (p. ej., 10 y 5 unidades) y 1 entrega para otros dos activos. Usa nombres de proveedor como `"TechDistrib Valencia S.L."`, `"Office Depot Miami"`.

### AssetExits (mínimo 3)

Incluye al menos una salida de `"allocation"` (con `assigned_to` relleno) y una de `"consumption"` (con `assigned_to` como nulo). Las cantidades no deben superar las entradas sembradas.

---

## Estructura de Archivos (dentro de `services/`)

```
services/
├── main.py
├── database.py          # Cliente TinyDB + motor SQLModel + dependencia get_db
├── models.py            # Asset, AssetEntry, AssetExit (SQLModel)
├── schemas.py           # Schemas Pydantic de request/response
└── routers/
    └── inventory.py     # APIRouter(prefix="/inventory")
```

---

## Notas de Evaluación para Nexova

- El evaluador intentará un `AssetExit` con cantidad superior al stock y esperará `HTTP 400`.
- El evaluador intentará un `AssetExit` con `exit_type = "allocation"` sin valor en `assigned_to` y esperará un error de validación.
- El evaluador llamará a `GET /inventory/products` y verificará que `current_stock` refleja el neto de los datos sembrados.
- El campo `office` debe aparecer tanto en los modelos como en los schemas de respuesta.

---

_Documento interno — 4Geeks Academy · Track de Ingeniería de IA_
_Hito 5 · Escenario Nexova_
