# BRIEFING — Nexova

## Modelo de pronóstico de series de tiempo para predicción de ventas

---

### 1. Por qué esto le importa a Nexova

Laura (CEO) necesita saber si el equipo puede predecir los ingresos de los próximos meses antes de comprometer presupuesto en un dashboard ejecutivo completo. El negocio de Nexova (headhunting, outsourcing de soporte y formación corporativa) tiene ciclos de contratación muy marcados por el calendario laboral en España y en Miami, algo que Javier (Operaciones) y Marcos (Ventas) sienten en carne propia cada agosto y cada enero.

---

### 2. Estructura de datos

El dataset mensual de ingresos consolidados de Nexova ya está incluido en tu monorepo, en `data/raw/nexova_sales.csv`, con estas columnas exactas:

| Columna | Tipo | Descripción |
|---|---|---|
| `month` | fecha (`YYYY-MM-01`) | Primer día del mes reportado |
| `revenue_usd` | float | Ingresos totales del mes, consolidados en USD |
| `active_contracts` | int | Número de contratos activos (headhunting + outsourcing + formación) durante el mes |
| `avg_contract_value_usd` | float | Valor promedio de contrato activo del mes |
| `business_line` | string | `"headhunting"`, `"outsourcing"`, `"training"`, o `"consolidated"` — usa `"consolidated"` como fila principal para el modelo |

La variable objetivo (target) del modelo es `revenue_usd` de la fila `consolidated`.

---

### 3. KPIs y qué significa un buen modelo aquí

- Un **Gini** alto es especialmente importante para Nexova: Laura necesita distinguir con confianza entre un mes flojo (típico en agosto) y una caída anómala que merezca atención inmediata.
- El **PSI** te ayuda a detectar si el mix de líneas de negocio (headhunting vs. outsourcing vs. formación) cambió significativamente entre el período de entrenamiento y el de prueba — repórtalo si ocurre.
- El **MSE** repórtalo en USD² y también como porcentaje del ingreso mensual promedio, para que Marcos y Laura puedan interpretarlo sin traducción adicional.

---

### 4. Sobre el dataset provisto

El archivo `data/raw/nexova_sales.csv` contiene **10 años** de datos mensuales (120 filas de `consolidated`), desde `2016-01` hasta `2025-12`. Ya refleja los siguientes patrones — no necesitas generarlos, pero sí entenderlos para interpretar los resultados de tu modelo:

**Patrón de crecimiento:** crecimiento anual base `X = 4%`, con variación `Y = 3%`. Cada año, el crecimiento real `d` alterna entre `X+Y` y `X-Y` (entre 1% y 7%), siempre positivo.

**Patrón de estacionalidad (presente cada año del dataset):**
- **Agosto:** caída de ingresos del 15–25% respecto al promedio, por el período vacacional de verano en España, que paraliza buena parte de la actividad de contratación corporativa.
- **Enero–Febrero:** alza de ingresos del 15–20% respecto al promedio, por la renovación de presupuestos y planes de contratación de las empresas cliente al inicio del año fiscal.
- El resto de los meses fluctúa de forma moderada (±5%) alrededor de la tendencia de crecimiento anual.

El dataset se generó con una semilla aleatoria fija (`random_state=42`), por lo que es determinista.

---

### 5. Restricciones de negocio

- Todos los valores de `revenue_usd` deben ser positivos.
- No debe haber meses faltantes en el rango 2016-01 a 2025-12.
- El dataset provisto solo incluye la fila `consolidated`; si separas por línea de negocio como feature adicional, recuerda que "outsourcing" (soporte al cliente) es la línea de mayor volumen relativo (~45% del total), seguida de headhunting (~35%) y formación (~20%).

---

### 6. Entregables esperados

- Script de entrenamiento en `scripts/` que cargue `data/raw/nexova_sales.csv`, separe los primeros 8 años como entrenamiento y los últimos 2 como prueba.
- Features causales de lag, estadísticas rodantes y calendario/estacionalidad construidos a partir de la serie (validados contra el patrón de crecimiento y estacionalidad descrito arriba), sin fuga de información desde filas futuras.
- Modelo entrenado (XGBoost o Random Forest) con las 4 métricas (MSE, PSI, Gini, K2 Score) calculadas sobre el conjunto de prueba.
- Visualización con la predicción y su rango de variabilidad frente a los datos reales de los 2 años de prueba.
- Prueba unitaria en `tests/pipelines/` que valide el split 8/2 años.