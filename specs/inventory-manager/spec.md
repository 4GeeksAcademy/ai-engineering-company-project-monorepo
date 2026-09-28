# Inventory Manager - Fase 1: Specify

## Contexto

El backoffice de Brasaland necesita registrar existencias por local para dar visibilidad a las roturas y excesos de stock.
Hoy los pedidos de ingredientes se hacen sin datos de inventario; el contexto operativo está en `CONTEXT.md` y `company-choice.md`.
Las convenciones y el contexto ya documentado se encuentran en `memory-bank/`.

## Alcance

- Incluye registrar y consultar artículos de inventario, registrar entradas, salidas y ajustes asociados a un artículo y un local, y consultar el stock disponible de cada artículo por local a partir de sus movimientos.
- No incluye gestión de proveedores, precios, órdenes de compra, aprobaciones, pedidos de emergencia, integración con POS, transferencias automatizadas entre locales, consolidación de compras, lotes, caducidad ni trazabilidad por proveedor.
- No incluye predicción de demanda, mínimos de stock por categoría o local, alertas de merma, registro detallado de desperdicio, ni automatizaciones del agente de inventario predictivo descrito en `company-choice.md`. El punto de reorden se define únicamente por artículo, no por categoría ni por local. El gestor de incidencias sigue siendo un módulo distinto.

## Criterios de aceptación

- **INV-001 (Ubicuo):** En todo momento, el stock de un artículo se calcula a partir de sus movimientos. No existe un endpoint, un campo de formulario ni una operación que edite el stock directamente.
- **INV-002 (Ubicuo):** El sistema muestra el stock disponible asociado al artículo y al local consultados, sin mezclar movimientos de otros artículos o locales.
- **INV-003 (Basado en evento):** Cuando se registra un artículo de inventario con nombre, categoría y unidad de medida válidos, el sistema lo persiste con un identificador único y lo deja disponible para registrar movimientos y consultar su stock. Si falta alguno de esos datos, el sistema rechaza el registro.
- **INV-004 (Basado en evento):** Cuando se registra una entrada, salida o ajuste válido para un artículo y un local, el sistema conserva el movimiento con su tipo y cantidad y refleja su efecto en el stock consultado para ese artículo y local.
- **INV-005 (De estado):** Mientras un artículo y un local no tengan movimientos registrados, la consulta de stock de ese artículo en ese local muestra cero, sin crear un valor de stock editable.
- **INV-006 (Comportamiento no deseado):** Si se intenta registrar un movimiento sin artículo o local identificable, sin tipo entre entrada, salida y ajuste, o sin una cantidad válida, el sistema lo rechaza y no altera el stock calculado.
- **INV-007 (Comportamiento no deseado):** Si se intenta asignar o modificar directamente el stock de un artículo, el sistema no ofrece esa operación y no cambia el stock; los cambios de existencias se registran mediante movimientos.
- **INV-008 (Ubicuo):** El catálogo de artículos es común a todos los locales: el mismo artículo conserva su identificador en cualquier local.
- **INV-009 (Ubicuo):** Cada artículo tiene un identificador único, nombre, unidad de medida y una categoría entre carne, verduras, salsas, bebidas, packaging y productos de limpieza.
- **INV-010 (Ubicuo):** Cada artículo tiene una unidad de medida que pertenece a un catálogo cerrado definido por el sistema: kg, g, l, ml, unidad.
- **INV-011 (Ubicuo):** El sistema no convierte cantidades entre unidades de medida.
- **INV-012 (Basado en evento):** Cuando se registra un movimiento con una cantidad decimal válida, el sistema admite esa cantidad sin exigir que sea entera.
- **INV-013 (Basado en evento):** Cuando se registra inventario inicial de un artículo en un local, el sistema lo registra como movimiento de tipo ajuste, nunca como entrada.
- **INV-014 (Basado en evento):** Cuando se registra un ajuste positivo, el sistema suma su cantidad al stock del artículo en ese local.
- **INV-015 (Basado en evento):** Cuando se registra un ajuste negativo, el sistema resta su cantidad del stock del artículo en ese local.
- **INV-016 (Comportamiento no deseado):** Si una salida o un ajuste negativo dejaría el stock de un artículo en un local por debajo de cero, el sistema rechaza el movimiento y conserva el stock previo.
- **INV-017 (Ubicuo):** Cada movimiento registrado conserva obligatoriamente su autor y su fecha.
- **INV-018 (Comportamiento no deseado):** Si falta el autor o la fecha al registrar un movimiento, el sistema rechaza el registro y no modifica el stock calculado.
- **INV-019 (Opcional):** Si se proporciona un motivo o una nota al registrar un movimiento, el sistema conserva ese dato con el movimiento; su ausencia no impide el registro.
- **INV-020 (Comportamiento no deseado):** Si se intenta editar o eliminar un movimiento ya registrado, el sistema rechaza la operación y conserva el historial y el stock calculado a partir de él.
- **INV-021 (Ubicuo):** El local es una entidad gestionada por el sistema, análoga al catálogo de artículos: se crea y consulta mediante sus propios endpoints, no está fijado en el código ni es texto libre sin validar.
- **INV-022 (Comportamiento no deseado):** Si se intenta registrar un artículo con una unidad de medida fuera del catálogo cerrado, el sistema rechaza el registro.
- **INV-023 (Comportamiento no deseado):** Si se intenta registrar un movimiento con un local que no existe en el catálogo, el sistema rechaza el registro y no altera el stock calculado.
- **INV-024 (Basado en evento):** Cuando se registra un local con nombre válido, el sistema lo persiste con un identificador único y lo deja disponible para registrar movimientos y consultar su stock. Si falta el nombre, el sistema rechaza el registro.
- **INV-025 (Ubicuo):** El catálogo de locales es común a toda la aplicación; cada local tiene un identificador único y un nombre no vacío.
- **INV-026 (Ubicuo):** Cada artículo tiene un punto de reorden: una cantidad numérica mayor o igual a cero, definida al registrarlo y aplicable por igual en todos los locales.
- **INV-027 (Comportamiento no deseado):** Si se intenta registrar un artículo sin punto de reorden, con un valor negativo o no numérico, el sistema rechaza el registro.
- **INV-028 (De estado):** Mientras el stock calculado de un artículo en un local esté por debajo de su punto de reorden, la consulta de stock de ese artículo y ese local lo señala explícitamente en la respuesta.
- **INV-029 (De estado):** Mientras haya artículos con stock por debajo de su punto de reorden en un local, el backoffice los muestra de forma visible en el listado de artículos para ese local.

## Preguntas abiertas / decisiones pendientes

Sin preguntas abiertas pendientes tras esta revisión.