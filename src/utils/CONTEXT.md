# Utils Context

Esta carpeta contiene utilidades reutilizables orientadas a lógica de apoyo, no a reglas de negocio completas.

## Estructura actual

Ideas clave:
- [src/utils/collections.ts](src/utils/collections.ts) reúne contratos y helpers base para trabajar con colecciones filtrables.
- [src/utils/validations.ts](src/utils/validations.ts) contiene validaciones reutilizables aplicadas a reglas y rangos.
- [src/utils/search.ts](src/utils/search.ts) adapta el sistema de filtros a las entidades del dominio.
- [src/utils/transformations.ts](src/utils/transformations.ts) agrupa funciones de agregación y reportes tipados.
- [src/utils/filters.ts](src/utils/filters.ts) archivo puente de compatibilidad mediante reexports.

Objetivo:
- evitar duplicar lógica de filtrado
- separar responsabilidades por módulo
- mantener filtros consistentes entre entidades
- facilitar añadir nuevas utilidades reutilizando la misma estructura