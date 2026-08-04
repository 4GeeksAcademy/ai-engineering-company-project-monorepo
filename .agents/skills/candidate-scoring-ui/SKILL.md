---
name: candidate-scoring-ui
description: Skill de desarrollo para generar y verificar componentes de interfaz que renderizan el scoring y ranking de candidatos frente a vacantes en el Backoffice de Nexova.
---

# Skill: Componente de Scoring de Candidatos (`candidate-scoring-ui`)

## 🎯 Objetivo Único
Proporcionar una instrucción estructurada y reutilizable para construir y verificar componentes React en TypeScript que muestren la puntuación (0-100), el desglose de compatibilidad y la información clave de un `Candidate` respecto a una `Vacancy`, utilizando semaforización visual de acuerdo con los estándares de Nexova.

---

## 📥 Entradas Requeridas (Inputs)

1. **`candidate` (`Candidate`)**: Objeto del candidato (id, fullName, email, skills, yearsOfExperience, englishLevel, seniority, etc.).
2. **`vacancy` (`Vacancy`)**: Objeto de la vacante con requisitos (requiredSkills, minYearsExperience, requiredEnglishLevel, etc.).
3. **`scoreResult` (`number` o `ScoreBreakdown`)**: Puntuación numérica calculada (0-100) proveniente de las utilidades de negocio del Hito 2 (`src/utils/`).

---

## ⚙️ Pasos de Ejecución

1. **Importación de Tipos y Lógica de Negocio:**
   - Importar `Candidate` y `Vacancy` desde los tipos originales del monorepo (`src/types/` o `@repo/shared`).
   - Prohibido redefinir o duplicar interfaces de candidatos o vacantes.

2. **Cálculo Visual de Semaforización:**
   - Si `score >= 80`: Aplicar estilos de alta compatibilidad (Verde / `bg-emerald-100 text-emerald-800 border-emerald-300`).
   - Si `score >= 50 && score < 80`: Aplicar estilos de compatibilidad media (Amarillo / `bg-amber-100 text-amber-800 border-amber-300`).
   - Si `score < 50`: Aplicar estilos de compatibilidad baja (Rojo / `bg-rose-100 text-rose-800 border-rose-300`).

3. **Renderizado de Información Relevante:**
   - Mostrar nombre completo, experiencia en años, nivel de inglés y seniority.
   - Mostrar etiquetas de habilidades (`skills`) con destaque para las coincidentes con la vacante.
   - Incluir botones de contacto/acción para los consultores de selección.

---

## ✅ Criterios de Aceptación (Verificables)

- [ ] **Type Safety:** El componente compila sin advertencias de TypeScript y no utiliza el tipo `any`.
- [ ] **Sin Duplicación:** La función de scoring o los datos no se recalculan con lógica personalizada dentro del componente; consume los resultados del módulo Hito 2.
- [ ] **Semaforización Visual Correcta:** Cumple estrictamente con las reglas de color según los rangos 80-100 (Verde), 50-79 (Amarillo) y 0-49 (Rojo).
- [ ] **Inmutabilidad:** El componente no modifica ninguna propiedad del objeto `candidate` ni del objeto `vacancy`.
- [ ] **Accesibilidad:** Los elementos de estado cuentan con contraste adecuado e indicadores legibles.
