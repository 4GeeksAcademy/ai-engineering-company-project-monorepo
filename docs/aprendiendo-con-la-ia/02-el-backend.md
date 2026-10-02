# 2. El backend (la API)

Una **API** es un programa que espera peticiones y responde. Cada tipo de petición tiene una dirección (una URL) y un verbo. Los verbos son como acciones:

| Verbo | Significa | Ejemplo en el proyecto |
|---|---|---|
| `GET` | "Dame información" | `GET /suppliers` → la lista |
| `POST` | "Crea algo nuevo" | `POST /suppliers` → alta de proveedor |
| `PATCH` | "Cambia una parte" | `PATCH /suppliers/1/rate` → nueva tarifa |
| `DELETE` | "Borra (solo proveedores activos)" | `DELETE /suppliers/3` |

## Las tres capas

El backend está dividido en tres archivos principales, cada uno con **una sola responsabilidad**. Es como una empresa donde cada persona tiene su trabajo.

| Archivo | Rol | Comparación |
|---|---|---|
| `models.py` | Define qué datos son válidos | El **reglamento** |
| `routes/suppliers.py` | Recibe las peticiones y devuelve respuestas | La **recepción**: atiende y deriva |
| `database.py` | Arranca TinyDB y hace el trabajo con la base de datos | El **almacén**: guarda y busca |

Además, `seed.py` carga los datos iniciales y `main.py` arranca la API y conecta las piezas.

Separarlo así tiene una ventaja enorme: si quieres cambiar una regla, sabes que solo tocas `models.py`.

## Paso 1: definir el modelo (`models.py`)

Un **modelo** es la lista de campos que tiene un proveedor. Los campos salen exactamente del encargo original (`CONTEXT-suppliers.md`):

| Campo | Qué es | Regla |
|---|---|---|
| `name` | Nombre | Obligatorio, no vacío |
| `country` | País | Solo `Spain` o `USA` |
| `categories` | Tipo de servicio | Lista, mínimo una, solo las 9 permitidas |
| `monthly_rate` | Tarifa mensual | Número **mayor que 0** |
| `currency` | Moneda | `EUR` si es Spain, `USD` si es USA |
| `status` | Estado | Solo `active` o `suspended` |
| `updated_at` | Cuándo cambió la tarifa | **Lo pone el sistema**, nunca el cliente |
| `contract_renewal_date`, `contact_email`, `notes` | Extras | Opcionales; si hay email, debe parecer un email; la fecha va como `YYYY-MM-DD` |

Para hacer cumplir estas reglas se usa **Pydantic**, una herramienta que revisa los datos antes de dejarlos pasar. Ejemplos reales del código:

```python
monthly_rate: float = Field(gt=0)      # "gt" = greater than: mayor que 0
status: SupplierStatus                 # solo acepta los valores del Enum
```

Un **Enum** es una lista cerrada de valores permitidos. Como una máquina de refrescos: solo puedes elegir entre los botones que tiene; no puedes pedir un refresco que no existe.

```python
class SupplierStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
```

Si alguien envía `"activo"` o `"Active"`, Pydantic lo rechaza con un **error 422** ("los datos que enviaste no son válidos"). Y lo hace **antes** de que el dato llegue a la base de datos.

### Varios modelos, no uno

Hay modelos distintos porque entrada y salida no son iguales:

| Modelo | Para qué | Diferencia |
|---|---|---|
| `SupplierCreate` | Lo que **envía** el cliente al crear | No lleva `id` ni `updated_at` |
| `SupplierRateUpdate` | Solo cambiar la tarifa | Un único campo |
| `SupplierStatusUpdate` | Solo cambiar el estado | Un único campo |
| `Supplier` | El registro completo | Añade `updated_at` |
| `SupplierOut` | Lo que **devuelve** la API | Añade `id` |

Además, los modelos de entrada tienen `extra="forbid"`: si el cliente intenta enviar un campo que no debe (por ejemplo `updated_at`), la API responde 422 en vez de ignorarlo en silencio. Así nadie puede falsear la fecha de auditoría.

## Paso 2: guardar los datos (`database.py` y TinyDB)

**TinyDB** es una base de datos muy sencilla: guarda todo en **un archivo de texto** (`db.json`). No hay que instalar ningún servidor. El tech lead lo eligió a propósito: para un directorio pequeño, una herramienta ligera es la correcta. Más adelante se cambiará a Postgres.

Un `db.json` se ve así (simplificado):

```json
{"_default": {"1": {"name": "LinkedIn Talent Solutions", "country": "Spain", "monthly_rate": 1200.0, ...}}}
```

TinyDB da a cada registro un **número de identificación (`id`)**: 1, 2, 3... Ese es el `id` que devuelve la API.

### La regla de la fecha de auditoría

El tech lead pidió que cuando se actualice una tarifa quede registrado **cuándo**. En `database.py`:

```python
def update_rate(supplier_id, monthly_rate):
    db.update({"monthly_rate": monthly_rate, "updated_at": _now()}, doc_ids=[supplier_id])
```

`_now()` devuelve la hora actual del **servidor**. El cliente no puede elegirla. Cambiar el estado o las notas **no** toca `updated_at`, porque esa fecha es solo de tarifas.

## Paso 3: las puertas de entrada (`routes/suppliers.py`)

Cada función con `@router.get(...)`, `@router.post(...)` etc. es una puerta. Además de dejar pasar, también **traduce los errores internos a códigos HTTP**:

| Código | Significa | Cuándo se usa aquí |
|---|---|---|
| `200` | Todo bien | Consultas y cambios correctos |
| `201` | Creado | Un alta correcta |
| `204` | Hecho, sin nada que devolver | Un borrado correcto |
| `404` | No encontrado | Un `id` que no existe |
| `409` | Conflicto | Borrar un proveedor **suspendido** (el encargo dice que se conservan) |
| `422` | Datos inválidos | País vacío, estado raro, tarifa 0... |

### Borrar y suspender

El encargo dice que **los proveedores suspendidos no se eliminan**: se conservan para guardar el historial comercial con esa empresa. Por eso `DELETE /suppliers/{id}` funciona así:

- Proveedor **activo**: se borra y responde `204`.
- Proveedor **suspendido**: responde `409` (conflicto) y no se toca. Para retirarlo, se deja suspendido.
- `id` que no existe: `404`.

El listado acepta filtros en la propia dirección: `GET /suppliers?country=USA&category=ats_software` devuelve solo los proveedores de USA que ofrecen ATS.

## Paso 4: el seeder (los datos iniciales)

Un **seeder** ("sembrador") es un script que **llena la base de datos con datos iniciales**. Así, cuando la API arranca por primera vez, no aparece vacía en la demo: ya tiene los 15 proveedores de Patricia.

Está en `services/api/seed.py` y se ejecuta con:

```bash
cd services/api
uv run seed          # carga los que falten
uv run seed --reset  # borra todo y vuelve a cargar los 15
```

Reglas que cumple:

1. **No duplica.** Si lo ejecutas dos veces, la segunda no añade nada. Antes de insertar, comprueba qué nombres ya existen. A esto se le llama ser **idempotente** (repetirlo no cambia el resultado).
2. **Valida.** Cada proveedor pasa por el mismo modelo de Pydantic antes de guardarse.
3. **Avisa.** Al final imprime cuántos insertó:

```
Seeding finished: 15 records inserted, 0 skipped (already present).
Total suppliers in database: 15
```

## Las mismas rutas en dos direcciones

Las rutas responden tanto en `/suppliers` (la que pide el encargo) como en `/api/suppliers` (la que usa la página web). Por qué está explicado en [04-decisiones-y-problemas.md](./04-decisiones-y-problemas.md).
