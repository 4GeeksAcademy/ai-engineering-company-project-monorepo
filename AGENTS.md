# AGENTS.md — Protocolo de Desarrollo TrackFlow

Este documento define las reglas de operación para cualquier agente de IA que trabaje en el repositorio.

## 1. Reglas de Lectura Inicial
Antes de realizar cualquier tarea, el agente debe leer:
- `memory-bank/projectbrief.md` (Contexto del negocio)
- `memory-bank/techContext.md` (Restricciones técnicas)
- `DESIGN.md` (Arquitectura del proyecto)
- `packages/logic/src/trackflow/contracts.ts` (Definiciones de datos)

## 2. Flujo Obligatorio antes de cada COMMIT
Todo cambio debe validar este flujo de 4 pasos ordenados:

1. **Paso 1 (Integridad de Tipos):** Ejecutar `npm run type-check`. Si hay errores de TS, no se puede proceder.
2. **Paso 2 (Validación de Arquitectura):** Confirmar que el cambio respeta el `DESIGN.md` y no duplica lógica fuera de `packages/logic/`.
3. **Paso 3 (Sincronización de Memoria):** **Actualizar obligatoriamente** `memory-bank/progress.md` o el archivo relevante en `memory-bank/` para reflejar el estado actual de la tarea.
4. **Paso 4 (Formateo y Commit):** Ejecutar `npm run lint` (si está configurado) y realizar el commit usando formato *Conventional Commits* (ej: `feat: [Hito4] integrar lógica de inventario`).

## 3. Zonas Protegidas
El agente **no debe modificar** los siguientes archivos sin confirmación explícita del humano:
- `.github/`
- `package.json` (raíz o de cualquier paquete)
- `tsconfig.json`
- `DESIGN.md`
- Cualquier archivo en `memory-bank/` (excepto para actualizar el progreso según el Paso 3)
- `uis/` (para evitar refactorizaciones arquitectónicas no planificadas)