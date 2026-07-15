# Rule: No Duplicar Lógica de Negocio

## Scope
always-active

## Intención
Evitar divergencia entre reglas de negocio al impedir copias de lógica en capas de UI o scripts locales.

## Regla
- Toda lógica de negocio debe vivir en módulos de dominio TypeScript reutilizables.
- Las UIs solo pueden consumir dicha lógica por import.
- Si una pantalla requiere nueva regla de negocio, se implementa en el dominio y luego se integra en UI.

## Checklist verificable
- [ ] No hay funciones de negocio nuevas embebidas en componentes React.
- [ ] No existen duplicados de funciones de src/utils en carpetas uis/*.
- [ ] Los imports de dominio en backoffice apuntan a src/utils y src/types.
- [ ] Typecheck pasa sin errores tras integración.

## Cuándo detenerse y preguntar
- Si la lógica requerida no existe en módulos de dominio.
- Si hay conflicto entre requerimiento funcional y separación de capas.
- Si se solicita copiar código como atajo.
