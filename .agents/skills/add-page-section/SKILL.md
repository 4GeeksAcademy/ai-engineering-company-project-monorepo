# Skill: Añadir sección de página

**Objetivo:** Insertar una sección funcional en `uis/website` o `uis/backoffice` sin duplicar lógica de negocio de `packages/logic`.

**Inputs:**
- `targetFile`: Archivo donde se insertará (ej. `page.tsx`).
- `sectionTitle`: Título visible de la sección.
- `content`: Componente o estructura de la sección.
- `domainData` (opcional): Datos de TrackFlow (inventario, envíos o transportistas) que deban provenir de `@trackflow/logic`.

**Pasos:**
1. Verificar que el componente no duplica lógica existente.
2. Crear el componente en la carpeta de componentes de la app destino.
3. Importarlo en el `targetFile`.
4. Si requiere cálculos de negocio, importar funciones desde `@trackflow/logic`.
5. Ejecutar `npm run type-check`.

**Criterios de Aceptación:**
- El componente no contiene estilos en línea (Regla `.agents/rules/no-inline-styles.md`).
- El componente está tipado con TypeScript.
- `npm run type-check` pasa sin errores.
- El build de la app objetivo pasa sin errores:
	- Website: `npm --workspace uis/website run build`
	- Backoffice: `npm --workspace uis/backoffice run build`