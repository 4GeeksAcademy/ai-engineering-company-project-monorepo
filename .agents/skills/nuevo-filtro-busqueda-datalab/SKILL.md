---
# Skill: Nuevo filtro, búsqueda o cálculo en el Data Lab

## Objetivo
Implementar una nueva acción de filtrado, búsqueda o cálculo en el Brasaland
Data Lab (uis/backoffice/data-lab/), siguiendo el mismo patrón que las
acciones ya existentes (Filtrado de ventas, Menu y locaciones, Búsquedas,
Cálculos financieros, Scoring de rendimiento, Validaciones), para que el
Data Lab crezca de forma consistente a medida que Brasaland Digital necesite
explorar nuevas dimensiones de sus datos.

## Cuándo usar esta skill
Cuando se necesite añadir una nueva forma de filtrar, buscar, calcular o
validar datos — por ejemplo: "filtrar ventas por proveedor", "buscar items
de menú por rango de precio", "calcular el ticket medio por país".

## Inputs requeridos
1. Nombre descriptivo de la acción (ej. "Filtrar ventas por proveedor")
2. Categoría a la que pertenece: una de las 6 existentes (Filtrado de ventas
   / Menu y locaciones / Búsquedas / Cálculos financieros / Scoring de
   rendimiento / Validaciones), o justificación si es una categoría nueva
3. Entidad(es) de datos sobre las que opera, tomadas de src/types/models.ts
   (ej. SaleTransaction, Location, MenuItem)
4. Criterio(s) de filtrado/búsqueda/cálculo: qué campos usa, qué operadores
   (igualdad, rango, texto, fecha)
5. Tipo de resultado esperado: lista filtrada, resultado único, o valor
   calculado

## Proceso
1. Elegir el archivo de destino según la naturaleza de la lógica:
   - Filtrado/búsqueda → src/utils/search.ts
   - Cálculo/transformación → src/utils/transformations.ts
   - Validación → src/utils/validations.ts
   - Operaciones sobre listas (ordenar, agrupar, paginar) → src/utils/collections.ts
2. Escribir la función en TypeScript, tipada con los tipos de
   src/types/models.ts — sin usar `any`.
3. Probarla contra los datos de src/data/sample-data.ts.
4. Añadir un nuevo panel en la UI (src/index.html + src/main.ts) dentro de
   la tarjeta de categoría correspondiente: inputs a la izquierda, botón de
   acción a la derecha, resultado visible al pulsar.
5. Confirmar que el resultado se muestra en pantalla, no solo en consola.

## Output esperado
- Una función nueva, tipada y probada contra sample-data.ts, en el archivo
  utils/ correcto.
- Un panel de UI conectado a esa función, visualmente coherente con los
  paneles existentes.

## Criterios de aceptación
- [ ] La función vive en el archivo utils/ correcto según su naturaleza
- [ ] Tipado explícito con tipos de types/models.ts, sin `any`
- [ ] Resultados correctos al probarla contra sample-data.ts (al menos un
      caso documentado)
- [ ] Nuevo panel en la UI, dentro de la categoría correspondiente, con
      inputs + botón de acción
- [ ] El resultado es visible en pantalla al pulsar el botón
- [ ] `npm run dev` arranca sin errores tras el cambio
---
