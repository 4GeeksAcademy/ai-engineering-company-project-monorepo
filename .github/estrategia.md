Plan: Lista de tareas Hito 2 Nexova
Objetivo: completar toda la lógica TypeScript del hito (tipos, utilidades, scoring, agregaciones y validaciones), cumpliendo criterios de type safety, pureza e inmutabilidad.

Steps

Fase 1 - Preparar estructura del hito: crear base TypeScript mínima donde exista src/utils y entorno de pruebas.
Fase 2 - Definir modelo de dominio: Candidate, Vacancy, SelectionProcess y tipos literales (niveles y estados).
Fase 3 - Implementar colecciones: filtros por skills/seniority/disponibilidad y ordenamientos por salario/experiencia sin mutación.
Fase 4 - Implementar búsqueda: búsqueda lineal por id, búsqueda lineal por email case-insensitive y búsqueda binaria por salario.
Fase 5 - Implementar scoring/matching: cálculo de score 0-100 respetando reglas de habilidades, experiencia, seniority, inglés y salario.
Fase 6 - Implementar transformaciones/reportes: ranking por score, agrupación por seniority, conteo por estado, promedio salarial, top skills y fill rate.
Fase 7 - Implementar validaciones: validateCandidate, validateVacancy e isValidEmail con acumulación de errores.
Fase 8 - Crear pruebas con datos de ejemplo: cubrir casos normales y bordes de cada función.
Fase 9 - Verificación final: type check, no mutaciones, redondeos a 2 decimales y checklist de criterios de aceptación.
Relevant files

CONTEXT-nexova.es.md
README.es.md
Archivos objetivo del hito: src/utils/collections.ts, src/utils/search.ts, src/utils/transformations.ts, src/utils/validations.ts
Recomendado para orden: carpeta de tipos y carpeta de tests unitarios del módulo
Verification

Pruebas unitarias por función y por regla de negocio.
Pruebas explícitas de inmutabilidad para sort y filter.
Casos de borde de score para cada bloque de puntos.
Validación de redondeo a 2 decimales en promedio salarial y fill rate.
Compilación TypeScript sin errores.
Decisions

Incluido: lógica de negocio pura y validaciones del Hito 2.
Excluido: UI, API backend, persistencia y despliegue.
Dependencia clave: definir ubicación final del módulo dentro del monorepo antes de implementar.