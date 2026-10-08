# Documentación de la Skill: `fastapi-tinydb-scaffolder`

## Descripción General
Esta skill (habilidad) ha sido diseñada para guiar a los agentes de IA que trabajen en este repositorio en el futuro. Al estar alojada en `.agents/skills/fastapi-tinydb-scaffolder/SKILL.md`, la IA la leerá automáticamente cuando necesite construir nuevos módulos de la API, asegurando que se respeten los estándares arquitectónicos y de seguridad del proyecto.

## Casos de Uso

### 1. Creación de una nueva entidad de negocio
**Escenario:** El líder del proyecto pide "Crear un módulo para administrar Facturas (Invoices)".
**Cómo interviene la skill:**
- La IA sabrá automáticamente que no debe inventar una estructura de carpetas nueva.
- Añadirá los modelos de validación `InvoiceCreate`, `InvoiceResponse` y `InvoiceBase` exclusivamente en `services/api/models.py`.
- Creará las operaciones de guardado y lectura de TinyDB en `services/api/database.py`.
- Levantará los endpoints en un nuevo archivo `services/api/routes/invoices.py`.
- Conectará el nuevo router en `services/api/main.py`.

### 2. Cumplimiento Obligatorio de Seguridad (JWT)
**Escenario:** Se le solicita a la IA crear un endpoint para "Listar todos los productos confidenciales".
**Cómo interviene la skill:**
- La IA verificará la regla de seguridad descrita en la skill.
- Obligatoriamente importará y utilizará la dependencia `Depends(get_current_user)` desde el módulo de autenticación.
- Esto prevendrá que la IA suba código con endpoints públicos que expongan datos privados de la empresa.

### 3. Gestión Unificada de Dependencias
**Escenario:** Un nuevo requerimiento necesita parsear PDFs, y la IA decide instalar una librería.
**Cómo interviene la skill:**
- Prevendrá que la IA ejecute comandos como `pip install pypdf2`.
- En su lugar, utilizará obligatoriamente el entorno virtual gestionado por `uv` y ejecutará `uv add pypdf2`, manteniendo la integridad del archivo `pyproject.toml`.

## Cómo Modificar o Extender esta Skill
Si en el futuro cambias de base de datos (por ejemplo, migrando de TinyDB a PostgreSQL con SQLAlchemy), simplemente debes editar el archivo `/.agents/skills/fastapi-tinydb-scaffolder/SKILL.md` para actualizar las instrucciones sobre cómo la IA debe interactuar con la capa de persistencia. La IA asimilará la nueva arquitectura de inmediato.
