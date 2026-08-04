# Rule: Convenciones de Código y Arquitectura para Nexova AI

---
scope: always
description: Reglas obligatorias de desarrollo, inmutabilidad y tipado para el monorepo de Nexova.
---

## 📌 Alcance (Scope)
- **Modo de Aplicación:** `always` (Esta regla debe aplicarse en todas las interacciones de desarrollo en el monorepo).

## 🛠️ Reglas Técnicas

1. **Tipado Estricto (No `any`):**
   - Todos los componentes y utilidades TypeScript deben estar explícitamente tipados.
   - Usar las interfaces de negocio `Candidate`, `Vacancy`, `EnglishLevel`, `SeniorityLevel` de Nexova.

2. **Inmutabilidad de Datos:**
   - Queda estrictamente prohibida la mutación directa de datos (`sort()`, `splice()`, mutación de propiedades).
   - Utilizar métodos inmutables (`toSorted()`, `filter()`, `map()`, spread `[...]`).

3. **Reusabilidad de Lógica (No Duplicación):**
   - La lógica de scoring, filtrado y validación de candidatos debe importarse desde su ubicación original en `src/` o `@repo/shared`.
   - Prohibido duplicar código de negocio dentro de `./uis/website` o `./uis/backoffice`.

4. **Componentes React/Next.js Clean Code:**
   - Separar la UI presentacional de la lógica de procesamiento.
   - Utilizar Tailwind CSS para estilos de componentes.
