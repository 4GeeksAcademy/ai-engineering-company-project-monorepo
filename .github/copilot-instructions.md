# Copilot Instructions - HealthCore TypeScript

Eres un desarollador profesional de scripts en typescript con muchisima experiencia.

Para entender el contexto del proyecto, busca el archivo CONTEXT-healthcore.es .md.

## Criterios de aceptacion

### Correccion tecnica

- Las interfaces TypeScript modelan correctamente las entidades especificadas en el CONTEXT-healthcore.es con todos sus campos y tipos.
- Las funciones de filtrado devuelven correctamente los elementos que cumplen los criterios especificados.
- El ordenamiento funciona correctamente en orden ascendente y descendente.
- La busqueda lineal encuentra elementos en arrays desordenados sin errores.
- La busqueda binaria funciona correctamente en arrays ordenados y devuelve el indice correcto o -1 si no se encuentra.
- Las agregaciones calculan correctamente totales, promedios, conteos y valores extremos.
- Las validaciones rechazan datos que no cumplen con las reglas de negocio del CONTEXT-healthcore.es.
- No hay errores de compilacion de TypeScript en ningun archivo.
- Existe un comando documentado para validar o ejecutar TypeScript en local (`npx tsc --noEmit`, `npm run typecheck`, etc.).

### Estructura y organizacion

- El codigo esta organizado en archivos separados por responsabilidad (`types`, `utils`, `validations`).
- Cada funcion tiene una unica responsabilidad claramente identificable.
- Los nombres de variables, funciones e interfaces son descriptivos y siguen las convenciones de TypeScript.

### Adaptacion al contexto

- Todos los nombres de entidades, campos y tipos coinciden exactamente con los especificados en el CONTEXT-healthcore.es.
- Las validaciones implementadas corresponden a las reglas de negocio definidas en el CONTEXT-healthcore.es.
- Los reportes generados responden a las necesidades especificas descritas en el CONTEXT-healthcore.es.

### Calidad de codigo

- Las funciones son puras: no dependen de variables externas ni modifican estado global.
- Se manejan correctamente casos limite: arrays vacios, elementos no encontrados, valores nulos.
- El codigo sigue las mejores practicas de TypeScript: tipos explicitos, uso adecuado de `const`/`let` y evita el uso de `any`.

### Calidad de Codigo

- Usa nombres descriptivos para variables, funciones e interfaces (camelCase para variables y funciones, PascalCase para interfaces).
- Cada funcion debe ser pura: trabaja solo con lo que recibe por parametros, sin modificar variables globales.
- Escribe comentarios solo cuando sea necesario para explicar logica compleja, no para describir codigo obvio.
- Maneja correctamente casos vacios: arrays vacios, elementos no encontrados y valores nulos.
- Usa `const` por defecto y `let` solo cuando el valor vaya a cambiar.
- Manten la indentacion y el formato consistentes en todo el codigo.
