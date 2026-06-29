## Hito 2

1. Sistema de gestión de colecciones: filtrar, ordenar, buscar y agrupar elementos dentro de arrays.
2. Modelado de datos con objetos e interfaces: Define las interfaces TypeScript que representan las entidades principales del negocio. Cada interfaz debe tener tipos explícitos para todas sus propiedades y métodos auxiliares para trabajar con esos datos. Usa objetos literales para representar instancias concretas.
3. Transformaciones y agregaciones: Implementa funciones que tomen colecciones de objetos y generen reportes simples: contar elementos por categoría, sumar valores numéricos, encontrar máximos y mínimos, calcular promedios. Todo debe estar tipado.
4. Validaciones de negocio: Crea funciones que validen que los datos cumplan con las reglas específicas de tu empresa antes de ser procesados o almacenados. Por ejemplo, verificar que un elemento tenga todos los campos obligatorios, que los valores numéricos estén dentro de rangos permitidos, o que las fechas sean coherentes.


```
src/
├── types/
│   └── models.ts          Interfaces y tipos
├── utils/
│   ├── collections.ts     # Funciones para arrays
│   ├── search.ts          # Búsquedas lineal y binaria
│   ├── transformations.ts # Agregaciones y reportes
│   └── validations.ts     # Validaciones de negocio
└── index.html             # Página de prueba (opcional)
```

### Test interactivo

```bash
npx http-server . -p 3000 -a 0.0.0.0
# → http://localhost:3000/test/
```

```
test/
└── index.html           # Página de prueba con Tailwind CSS
```

Incluye portabilidad completa de los módulos TS a JS plano en un solo archivo, usando los objetos literales de `models.ts` y datos extra para ejercitar:

- Filtros y búsqueda por entidad (`filterShipments`, `filterInventory`, `filterReturns`, `filterTickets`, `filterCarrierPerformance`)
- Transformaciones (`countByCategory`, `sumBy`, `averageBy`, `maxBy`, `minBy`)
- Validaciones (`inNumericRange`, `matchesRule`)
