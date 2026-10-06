# CONTEXT — Directorio de Proveedores · Nexova

_These instructions are also available in [English](./CONTEXT-nexova.en.md)._

> **Milestone:** 09 — Lightweight Storage API  
> **Ruta en el repositorio:** `09-lightweight-storage/CONTEXT-nexova.md`

---

## Tu empresa

Eres parte del equipo de AI Engineering de **Nexova**, una consultora de recursos humanos y adquisición de talento con sede en Valencia (España) y oficina en Miami (Florida). Tu tech lead es **Sergio Molina**, CTO, y el proyecto ha sido solicitado por **Patricia Solís**, HR Manager, en coordinación con el área de operaciones.

Nexova contrata servicios externos de forma recurrente: plataformas de publicación de ofertas de empleo, herramientas de selección, proveedores de formación, software corporativo y servicios de outsourcing. Hasta ahora, este registro vive en una hoja de cálculo que Patricia actualiza manualmente y comparte por email cada vez que hay un cambio. El resultado son múltiples versiones circulando en paralelo sin que nadie sepa cuál es la vigente. Este proyecto crea el registro oficial y único.

---

## Modelo de proveedor

Cada proveedor en el directorio de Nexova tiene la siguiente estructura:

| Campo                   | Tipo                                  | Descripción                                             |
| ----------------------- | ------------------------------------- | ------------------------------------------------------- |
| `name`                  | string, requerido                     | Nombre comercial del proveedor o plataforma             |
| `country`               | string, requerido                     | País del contrato activo: `"Spain"` o `"USA"`           |
| `categories`            | lista de strings, requerido, mínimo 1 | Tipo de servicio que provee (ver lista válida)          |
| `monthly_rate`          | float, requerido, > 0                 | Coste mensual vigente en la moneda del contrato         |
| `currency`              | string, requerido                     | `"EUR"` para Spain, `"USD"` para USA                    |
| `updated_at`            | datetime, generado por el sistema     | Timestamp de la última actualización de tarifa          |
| `status`                | string, requerido                     | `"active"` o `"suspended"`                              |
| `contract_renewal_date` | string, opcional                      | Fecha de renovación del contrato (formato `YYYY-MM-DD`) |
| `contact_email`         | string, opcional                      | Email del account manager del proveedor                 |
| `notes`                 | string, opcional                      | Observaciones internas                                  |

### Categorías válidas

```python
VALID_CATEGORIES = [
    "job_boards",
    "ats_software",
    "assessment_tools",
    "training_platforms",
    "payroll_and_hr_software",
    "video_interview",
    "background_check",
    "office_and_facilities",
    "it_and_software_licenses"
]
```

### Estados válidos

```python
VALID_STATUSES = ["active", "suspended"]
```

---

## Datos iniciales del seeder

El seeder debe cargar exactamente los siguientes proveedores, que representan el estado actual del directorio de Patricia.

```python
SUPPLIERS_SEED = [
    {
        "name": "LinkedIn Talent Solutions",
        "country": "Spain",
        "categories": ["job_boards"],
        "monthly_rate": 1200.0,
        "currency": "EUR",
        "status": "active",
        "contract_renewal_date": "2025-03-31",
        "contact_email": "account@linkedin.com",
        "notes": "Licencia corporativa para publicación de ofertas y búsqueda de candidatos."
    },
    {
        "name": "InfoJobs Premium",
        "country": "Spain",
        "categories": ["job_boards"],
        "monthly_rate": 490.0,
        "currency": "EUR",
        "status": "active",
        "contract_renewal_date": "2025-06-30",
        "contact_email": "empresas@infojobs.net"
    },
    {
        "name": "Indeed Sponsored",
        "country": "USA",
        "categories": ["job_boards"],
        "monthly_rate": 850.0,
        "currency": "USD",
        "status": "active",
        "contact_email": "sales@indeed.com",
        "notes": "Campañas de pago por clic para perfiles de customer support en Miami."
    },
    {
        "name": "Workable",
        "country": "Spain",
        "categories": ["ats_software"],
        "monthly_rate": 299.0,
        "currency": "EUR",
        "status": "active",
        "contract_renewal_date": "2025-09-15",
        "contact_email": "support@workable.com",
        "notes": "ATS principal para el equipo de selección de Valencia."
    },
    {
        "name": "Greenhouse",
        "country": "USA",
        "categories": ["ats_software"],
        "monthly_rate": 620.0,
        "currency": "USD",
        "status": "suspended",
        "contact_email": "accounts@greenhouse.io",
        "notes": "Suspendido tras no renovar. Sergio está evaluando si migrar todo a Workable."
    },
    {
        "name": "Thomas International",
        "country": "Spain",
        "categories": ["assessment_tools"],
        "monthly_rate": 380.0,
        "currency": "EUR",
        "status": "active",
        "contract_renewal_date": "2025-12-01",
        "contact_email": "clientes@thomas.es",
        "notes": "Tests de personalidad y aptitud para procesos de mandos intermedios."
    },
    {
        "name": "HireVue",
        "country": "USA",
        "categories": ["video_interview"],
        "monthly_rate": 540.0,
        "currency": "USD",
        "status": "active",
        "contract_renewal_date": "2025-08-31",
        "contact_email": "support@hirevue.com"
    },
    {
        "name": "Udemy Business",
        "country": "Spain",
        "categories": ["training_platforms"],
        "monthly_rate": 420.0,
        "currency": "EUR",
        "status": "active",
        "contract_renewal_date": "2026-01-15",
        "contact_email": "business@udemy.com",
        "notes": "Licencias para el equipo interno. Gestionado por Elena Vargas."
    },
    {
        "name": "Coursera for Teams",
        "country": "USA",
        "categories": ["training_platforms"],
        "monthly_rate": 399.0,
        "currency": "USD",
        "status": "suspended",
        "contact_email": "teams@coursera.com",
        "notes": "Suspendido por bajo uso. Revisar antes de Q4."
    },
    {
        "name": "Sage HR",
        "country": "Spain",
        "categories": ["payroll_and_hr_software"],
        "monthly_rate": 310.0,
        "currency": "EUR",
        "status": "active",
        "contract_renewal_date": "2025-10-01",
        "contact_email": "soporte@sage.com",
        "notes": "Software de nóminas y gestión de personal para la sede de Valencia."
    },
    {
        "name": "Gusto",
        "country": "USA",
        "categories": ["payroll_and_hr_software"],
        "monthly_rate": 280.0,
        "currency": "USD",
        "status": "active",
        "contact_email": "support@gusto.com",
        "notes": "Gestión de nóminas para los empleados de la oficina de Miami."
    },
    {
        "name": "Checkr",
        "country": "USA",
        "categories": ["background_check"],
        "monthly_rate": 195.0,
        "currency": "USD",
        "status": "active",
        "contract_renewal_date": "2025-11-30",
        "contact_email": "sales@checkr.com"
    },
    {
        "name": "Microsoft 365 Business",
        "country": "Spain",
        "categories": ["it_and_software_licenses"],
        "monthly_rate": 760.0,
        "currency": "EUR",
        "status": "active",
        "contact_email": "enterprise@microsoft.com",
        "notes": "Licencias para toda la plantilla de Valencia y Miami."
    },
    {
        "name": "Regus Valencia",
        "country": "Spain",
        "categories": ["office_and_facilities"],
        "monthly_rate": 2400.0,
        "currency": "EUR",
        "status": "active",
        "contract_renewal_date": "2025-07-01",
        "contact_email": "valencia@regus.com",
        "notes": "Alquiler de la oficina principal en Valencia. Incluye sala de reuniones."
    },
    {
        "name": "WeWork Miami",
        "country": "USA",
        "categories": ["office_and_facilities"],
        "monthly_rate": 3100.0,
        "currency": "USD",
        "status": "active",
        "contract_renewal_date": "2025-09-30",
        "contact_email": "miami@wework.com"
    }
]
```

---

## Restricciones de negocio

- **Moneda por país:** Un proveedor de `"Spain"` debe tener `currency = "EUR"`. Un proveedor de `"USA"` debe tener `currency = "USD"`. La API debe rechazar combinaciones inconsistentes.
- **Trazabilidad de tarifas:** Cada actualización de `monthly_rate` debe registrar el `updated_at` automáticamente. Patricia usa este dato para justificar variaciones de presupuesto ante dirección.
- **Renovaciones próximas:** El campo `contract_renewal_date` es opcional pero relevante — los proveedores con renovación en los próximos 60 días deben destacarse visualmente en el frontend.
- **Suspensión controlada:** Los proveedores suspendidos no se eliminan. Permanecen en el directorio con estado `"suspended"` para mantener el historial de relaciones comerciales.

---

## Lo que verá Patricia en el frontend

La página del directorio debe permitirle a Patricia:

1. Ver todos los proveedores agrupados o filtrables por país (Spain / USA).
2. Filtrar por categoría para responder preguntas como "¿qué herramientas de ATS tenemos activas?".
3. Distinguir de un vistazo los proveedores activos de los suspendidos.
4. Registrar un proveedor nuevo desde un formulario.
5. Actualizar la tarifa mensual de un proveedor y ver el cambio reflejado inmediatamente.
6. Activar o suspender un proveedor con un control visible en cada fila.

---

_Documento interno — 4Geeks Academy · AI Engineering Track_
