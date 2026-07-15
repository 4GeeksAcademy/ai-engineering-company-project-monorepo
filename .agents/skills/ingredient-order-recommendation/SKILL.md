# Skill: ingredient-order-recommendation

## Objetivo único
Generar una recomendación de pedido de ingredientes por local Brasaland con trazabilidad mínima y criterios verificables.

## Cuándo usar
- Al preparar sugerencias de compra semanales/diarias por local.
- Al detectar riesgo de quiebre de stock en ingredientes críticos.

## Inputs requeridos
- salesByLocal: ventas históricas por local y día.
- stockByLocal: stock actual por ingrediente y local.
- recipeMap: consumo estimado por ingrediente según platillo/receta.
- supplierConstraints: mínimos de compra y lead time por proveedor.

## Output esperado
- suggestedOrders: lista de pedidos sugeridos por local e ingrediente.
- alerts: ingredientes en riesgo (stockout/overstock).
- summary: resumen para Compras (impacto y observaciones).

## Procedimiento
1. Calcular consumo esperado por ingrediente en la ventana temporal definida.
2. Comparar consumo esperado vs stock actual y umbral mínimo.
3. Ajustar cantidades por constraints de proveedor.
4. Emitir recomendaciones y alertas con justificación breve.

## Criterios de aceptación verificables
- [ ] Cobertura: todos los locales activos tienen salida en suggestedOrders o justificación explícita.
- [ ] Integridad: no hay cantidades negativas, NaN ni ingredientes sin identificador.
- [ ] Restricciones: 100% de recomendaciones cumplen MOQ y lead time declarados.
- [ ] Trazabilidad: cada recomendación incluye razón breve basada en consumo/stock.
- [ ] Visibilidad: el resultado puede mostrarse en UI o reporte, no solo en consola.

## Ejemplo mínimo de salida
```json
{
  "suggestedOrders": [
    {
      "localId": "MED-001",
      "ingredientId": "ING-001",
      "quantity": 30,
      "reason": "Consumo proyectado supera stock mínimo en 48h"
    }
  ],
  "alerts": [
    {
      "localId": "MIA-001",
      "ingredientId": "ING-006",
      "risk": "stockout"
    }
  ],
  "summary": "3 locales con riesgo alto, consolidar compra de carne para negociación"
}
```
