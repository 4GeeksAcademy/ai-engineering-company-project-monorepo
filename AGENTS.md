# AGENTS.md

## Read First: Memory Bank obligatorio
Antes de cualquier cambio, todo agente debe leer en este orden:
1. memory-bank/projectbrief.md
2. memory-bank/techContext.md
3. memory-bank/progress.md

## Flujo obligatorio antes de commit
1. Entender alcance: leer memoria y confirmar requisito funcional/técnico del ticket.
2. Planificar impacto: identificar archivos objetivo y validar que no se rompen restricciones de arquitectura.
3. Implementar y verificar: aplicar cambios mínimos, ejecutar typecheck/build y revisar errores.
4. Actualizar contexto: registrar decisiones y estado en memory-bank/progress.md.
5. Preparar entrega: redactar resumen de cambios, riesgos y evidencias de validación.

## Zonas protegidas (no modificar sin confirmación explícita)
- CONTEXT.md
- company-choice.md
- memory-bank/projectbrief.md
- memory-bank/techContext.md
- Cualquier archivo bajo infra/ y mcps/
- Historial o artefactos de hitos cerrados que no sean parte del alcance solicitado

## Reglas operativas del repo
- No copiar lógica de negocio entre capas; siempre importar desde módulos de dominio.
- Mantener APIs y workers dentro de services/.
- Mantener separación visual y de layout entre apps públicas e internas.
- Si una decisión cambia arquitectura o alcance, detenerse y pedir confirmación.
