# Implementation Plan: Gestión de Inventario (Activos de Nexova)

## Objetivo
Implementar una API de gestión de inventario con arquitectura de doble base de datos (TinyDB para Auth, Supabase para Inventario) para gestionar los activos físicos y digitales de los empleados de **Nexova Solutions**. 

## Entidades (Adaptación a Nexova Solutions)
Dado que Nexova es una consultora de recursos humanos y outsourcing, el "inventario" más crítico a gestionar son los **Activos Corporativos** (licencias de software, equipos para agentes de soporte, etc.).

- **Asset (Equivalente a Producto):** Representa un activo de la empresa (ej. Licencia de HubSpot, Laptop, Headset). 
  - Campos: `id`, `name`, `sku`, `department` (clave de partición definida en el contexto, ej. "Ventas", "Soporte al Cliente").
- **AssetAcquisition (Orden de Entrada):** Registro de compra o alta de nuevos activos.
- **AssetAssignment (Orden de Salida):** Registro de entrega de un activo a un empleado o departamento.

## Fases de Implementación

### Fase 1: Configuración de Bases de Datos (`.env` y `database.py`)
- **Paso 1:** Agregar cadena de conexión de Supabase (Transaction Pooler, tipo URI) al archivo `.env`. Asegurar que está en `.gitignore`.
- **Paso 2:** En `database.py`, inicializar el motor `SQLModel` apuntando a Supabase, manteniendo el cliente TinyDB.
- **Paso 3:** Crear la dependencia `get_db` usando `Depends()` para inyectar la sesión SQLModel en cada request. *Prohibido usar sesiones globales.*

### Fase 2: Modelos ORM (`models.py`)
- **Paso 1:** Crear el modelo `Asset` (`table=True`) con los campos definidos.
- **Paso 2:** Crear el modelo `AssetAcquisition` con `id`, `asset_id` (FK a Asset), `quantity`, `created_at`, y `user_uuid` (string, obtenida de TinyDB).
- **Paso 3:** Crear el modelo `AssetAssignment` con `id`, `asset_id` (FK a Asset), `quantity`, `created_at`, y `user_uuid`.
- **Paso 4:** Invocar `SQLModel.metadata.create_all(engine)` al inicio del ciclo de vida de la app (Lifespan o equivalente).

### Fase 3: Schemas Pydantic (`schemas.py`)
- **Paso 1:** Definir esquemas independientes para request y response (ej. `AssetCreate`, `AssetRead`, `AssetAcquisitionCreate`, etc.).
- **Paso 2:** Incluir obligatoriamente el campo calculado `current_stock` en el esquema `AssetRead`.
- **Paso 3:** Asegurar que estos archivos estén físicamente separados de `models.py`.

### Fase 4: Router y Endpoints (`routers/inventory.py`)
- **Paso 1:** Registrar `APIRouter(prefix="/inventory")`.
- **Paso 2:** Crear endpoint **`GET /inventory/products`**: Retorna lista de `Asset`. El `current_stock` se calcula dinámicamente sumando adquisiciones y restando asignaciones.
- **Paso 3:** Crear endpoint **`POST /inventory/products`**: Crea un `Asset`. *Requiere autenticación.*
- **Paso 4:** Crear endpoint **`GET /inventory/products/{id}`**: Obtiene un `Asset` específico con su stock.
- **Paso 5:** Crear endpoint **`POST /inventory/orders/inbound`**: Registra un `AssetAcquisition`. *Requiere autenticación (guarda el user_uuid).*
- **Paso 6:** Crear endpoint **`POST /inventory/orders/outbound`**: Registra un `AssetAssignment`. *Requiere autenticación.* **Regla estricta:** Antes de persistir, debe validar que `quantity` no supere el stock actual en ese `department`. Si lo supera, devuelve `HTTP 400`.
- **Paso 7:** Crear endpoint **`GET /inventory/orders`**: Lista todas las órdenes (inbound y outbound) con datos relacionales.

### Fase 5: Datos Semilla y Pruebas
- **Paso 1:** Crear un script semilla que introduzca activos reales de Nexova (ej. Licencias de software para el equipo de Ventas, Headsets para los 30 agentes de Soporte).
- **Paso 2:** Validar rigurosamente que una orden de salida mayor al stock lance HTTP 400.

---

## ⚙️ Métodos Aplicados (Code Refinement Suite)
- **Step-Back Prompting / Abstracción (PACK PLANNER):** Se analizó primero el contexto general de Nexova Solutions para determinar la entidad de inventario más lógica (Activos Corporativos) alejándonos de un modelo retail genérico.
- **Self-Refinement Loop (PACK PLANNER):** El plan fue estructurado asegurando el cumplimiento estricto de los "criterios de evaluación" de `STRATEGY.md` (separación de schemas/models, stock inmutable, Depends, rechazo HTTP 400).
- **Simulación de Seguridad (PACK AUDITOR / PRE-PLAN):** Se planificó explícitamente el control de stock negativo previo a la escritura en DB para prevenir condiciones de carrera lógicas en las salidas de inventario.
