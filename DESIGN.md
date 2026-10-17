# DESIGN.md - Visión de Producto y Arquitectura

## 1. Propósito de las aplicaciones
- **`uis/website`**: Interfaz pública. Enfoque: Visualización, búsqueda de productos y experiencia de usuario.
- **`uis/backoffice`**: Interfaz de gestión. Enfoque: Operaciones CRUD (Crear, Leer, Actualizar, Borrar), gestión de inventario y analíticas de transportistas.

## 2. Mapa de Componentes UI

| Componente | Website | Backoffice |
| :--- | :---: | :---: |
| Dashboard / Resumen | - | ✅ |
| Catálogo de Productos | ✅ | ✅ |
| Panel de Inventario | - | ✅ |
| Buscador / Filtros | ✅ | ✅ |
| Seguimiento de Envíos | ✅ | ✅ |

## 3. Flujo de Datos
Ambas aplicaciones se comunican con el "cerebro" (`@trackflow/logic`):
1. La UI solicita datos a través de *hooks*.
2. Los *hooks* llaman a las funciones en `@trackflow/logic`.
3. `@trackflow/logic` devuelve los datos procesados e inmutables.
4. La UI se renderiza basada en esos datos.

## 4. Reglas de diseño
1. **Unidireccionalidad:** La UI no debe contener lógica de negocio. Si una función requiere cálculos, se mueve a `packages/logic`.
2. **Estilo:** Ambas aplicaciones usarán el mismo sistema de diseño (Tailwind CSS) definido en `packages/shared/`.