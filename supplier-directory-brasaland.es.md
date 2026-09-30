# CONTEXT — Directorio de Proveedores · Brasaland


> **Milestone:** 09 — Lightweight Storage API  
> **Ruta en el repositorio:** `09-lightweight-storage/CONTEXT-brasaland.md`

---

## Tu empresa

Eres parte del equipo **Brasaland Digital**, la unidad tecnológica interna de Brasaland, una cadena de restaurantes de comida a la brasa con **14 locales** en Colombia y Florida. Tu tech lead es **Nicolás Park**, CTO, y quien ha solicitado este proyecto es **Lucía Fernández**, Procurement Manager.

Brasaland trabaja con alrededor de **20 proveedores activos** distribuidos entre Colombia y Florida. Hasta ahora, Lucía gestiona el directorio en una hoja de cálculo compartida por correo. Cada vez que cambia la tarifa de un proveedor o hay que incorporar uno nuevo, hay tres versiones del fichero en circulación y nadie sabe cuál es la oficial. Este proyecto crea la fuente de verdad única.

---

## Modelo de proveedor

Cada proveedor en el directorio de Brasaland tiene la siguiente estructura:

| Campo           | Tipo                                  | Descripción                                              |
| --------------- | ------------------------------------- | -------------------------------------------------------- |
| `name`          | string, requerido                     | Nombre comercial del proveedor                           |
| `country`       | string, requerido                     | País de operación: `"Colombia"` o `"USA"`                |
| `categories`    | lista de strings, requerido, mínimo 1 | Categorías de producto que suministra (ver lista válida) |
| `rate_per_unit` | float, requerido, > 0                 | Tarifa vigente por unidad en la moneda del país          |
| `currency`      | string, requerido                     | `"COP"` para Colombia, `"USD"` para USA                  |
| `updated_at`    | datetime, generado por el sistema     | Timestamp de la última actualización de tarifa           |
| `status`        | string, requerido                     | `"active"` o `"suspended"`                               |
| `contact_email` | string, opcional                      | Email de contacto del proveedor                          |
| `notes`         | string, opcional                      | Observaciones internas del equipo de compras             |

### Categorías válidas

```python
VALID_CATEGORIES = [
    "carne",
    "verduras_y_hortalizas",
    "salsas_y_condimentos",
    "bebidas",
    "packaging",
    "productos_limpieza",
    "lacteos",
    "carbon_y_combustible"
]
```

### Estados válidos

```python
VALID_STATUSES = ["active", "suspended"]
```

---

## Datos iniciales del seeder

El seeder debe cargar exactamente los siguientes proveedores. Son los que Lucía tiene en su hoja de cálculo actual — la que este proyecto reemplaza.

```python
SUPPLIERS_SEED = [
    {
        "name": "Carnes del Valle S.A.S.",
        "country": "Colombia",
        "categories": ["carne"],
        "rate_per_unit": 28500.0,
        "currency": "COP",
        "status": "active",
        "contact_email": "ventas@carnesdelvalle.co",
        "notes": "Proveedor principal de res y cerdo para Medellín. Entrega martes y viernes."
    },
    {
        "name": "Frigorífico Antioqueño",
        "country": "Colombia",
        "categories": ["carne"],
        "rate_per_unit": 27900.0,
        "currency": "COP",
        "status": "active",
        "contact_email": "pedidos@frigorificoa.co",
        "notes": "Proveedor secundario. Usado cuando Carnes del Valle no tiene stock."
    },
    {
        "name": "Verduras La Cosecha",
        "country": "Colombia",
        "categories": ["verduras_y_hortalizas"],
        "rate_per_unit": 3200.0,
        "currency": "COP",
        "status": "active",
        "contact_email": "lacosecha@gmail.com",
        "notes": "Mercado mayorista de Medellín. Entrega diaria antes de las 7am."
    },
    {
        "name": "Condimentos El Sabor",
        "country": "Colombia",
        "categories": ["salsas_y_condimentos"],
        "rate_per_unit": 12400.0,
        "currency": "COP",
        "status": "active",
        "contact_email": "info@elsabor.co"
    },
    {
        "name": "Distribuidora RefriCol",
        "country": "Colombia",
        "categories": ["bebidas", "lacteos"],
        "rate_per_unit": 4100.0,
        "currency": "COP",
        "status": "active",
        "contact_email": "refricol.pedidos@gmail.com"
    },
    {
        "name": "Empaques y Más",
        "country": "Colombia",
        "categories": ["packaging"],
        "rate_per_unit": 890.0,
        "currency": "COP",
        "status": "active",
        "contact_email": "ventas@empaquesymas.co",
        "notes": "Suministra cajas, bolsas y servilletas para todos los locales de Colombia."
    },
    {
        "name": "Limpiahogar Profesional",
        "country": "Colombia",
        "categories": ["productos_limpieza"],
        "rate_per_unit": 7600.0,
        "currency": "COP",
        "status": "suspended",
        "contact_email": "limpiahogar@promail.co",
        "notes": "Suspendido por incumplimiento en entregas. En revisión por Lucía."
    },
    {
        "name": "CarboCo",
        "country": "Colombia",
        "categories": ["carbon_y_combustible"],
        "rate_per_unit": 45000.0,
        "currency": "COP",
        "status": "active",
        "contact_email": "pedidos@carboco.co",
        "notes": "Único proveedor homologado de carbón para las brasas. Contrato anual."
    },
    {
        "name": "Miami Meat Distributors LLC",
        "country": "USA",
        "categories": ["carne"],
        "rate_per_unit": 6.80,
        "currency": "USD",
        "status": "active",
        "contact_email": "orders@miamimeat.com",
        "notes": "Proveedor principal de carne para los locales de Florida."
    },
    {
        "name": "Sunshine Produce FL",
        "country": "USA",
        "categories": ["verduras_y_hortalizas"],
        "rate_per_unit": 2.15,
        "currency": "USD",
        "status": "active",
        "contact_email": "sales@sunshineproduce.com"
    },
    {
        "name": "Latin Flavors Inc.",
        "country": "USA",
        "categories": ["salsas_y_condimentos", "bebidas"],
        "rate_per_unit": 4.50,
        "currency": "USD",
        "status": "active",
        "contact_email": "orders@latinflavors.com",
        "notes": "Importa salsas colombianas para el mercado de Florida."
    },
    {
        "name": "PackRight USA",
        "country": "USA",
        "categories": ["packaging"],
        "rate_per_unit": 0.35,
        "currency": "USD",
        "status": "active",
        "contact_email": "info@packright.us"
    },
    {
        "name": "CleanPro Florida",
        "country": "USA",
        "categories": ["productos_limpieza"],
        "rate_per_unit": 12.90,
        "currency": "USD",
        "status": "active",
        "contact_email": "orders@cleanproflorida.com"
    },
    {
        "name": "GrillFuel Supply Co.",
        "country": "USA",
        "categories": ["carbon_y_combustible"],
        "rate_per_unit": 38.50,
        "currency": "USD",
        "status": "active",
        "contact_email": "supply@grillfuel.com",
        "notes": "Proveedor de carbón para Florida. Precio sujeto a revisión trimestral."
    },
    {
        "name": "Bebidas Andinas",
        "country": "Colombia",
        "categories": ["bebidas"],
        "rate_per_unit": 3800.0,
        "currency": "COP",
        "status": "suspended",
        "contact_email": "ventas@bebidasandinas.co",
        "notes": "Suspendido. Precio por encima del mercado tras última renegociación."
    }
]
```

---

## Restricciones de negocio

- **Moneda por país:** Un proveedor de `"Colombia"` debe tener `currency = "COP"`. Un proveedor de `"USA"` debe tener `currency = "USD"`. La API debe rechazar combinaciones inconsistentes.
- **Categorías múltiples:** Un proveedor puede suministrar más de una categoría (por ejemplo, bebidas y lácteos). La lista `categories` debe tener al menos un elemento válido.
- **Trazabilidad de tarifas:** Cada vez que se actualiza `rate_per_unit`, el campo `updated_at` debe registrar el timestamp exacto del cambio. Este dato es requerido por Lucía para auditorías de precios.
- **Suspensión, no borrado:** En la operativa real de Brasaland, los proveedores no se eliminan del sistema — se suspenden. El endpoint `DELETE` existe para correcciones de datos erróneos, no como flujo habitual.

---

## Lo que verá Lucía en el frontend

La página del directorio debe permitirle a Lucía:

1. Ver todos los proveedores de un vistazo, con indicación clara de cuáles están activos y cuáles suspendidos.
2. Filtrar por país (Colombia / USA) para ver solo los proveedores relevantes a cada mercado.
3. Filtrar por categoría para responder preguntas como "¿qué proveedores de carne tenemos activos en USA?".
4. Registrar un proveedor nuevo desde un formulario.
5. Actualizar la tarifa de un proveedor existente desde la interfaz.
6. Activar o suspender un proveedor con un solo clic.

---

_Documento interno — 4Geeks Academy · AI Engineering Track_
