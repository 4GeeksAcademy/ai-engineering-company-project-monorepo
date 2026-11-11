# Reporte Técnico de Evaluación del Modelo de Pronóstico de Ventas

**Empresa:** Nexova Solutions  
**Fecha:** 2026-11-09  
**Modelo Evaluado:** Random Forest Regressor (`n_estimators=150`, `max_depth=6`, `min_samples_split=4`)  
**Conjunto de Datos:** `data/raw/nexova_sales.csv` (120 meses: 8 años Train [2016-2023] / 2 años Test [2024-2025])  
**Target:** `revenue_usd` (Serie Consolidada)  
**Ticket:** Formal Technical Model Evaluation (Pre-Staging Gate)

---

## 1. Resumen Ejecutivo y Diagnóstico Oficial

| Pregunta del Ticket | Dictamen Técnico | Evidencia Cuantitativa Principal |
|---|---|---|
| **¿El modelo tiene underfitting, overfitting o está bien ajustado?** | **Overfitting (Alta Varianza)** | Brecha persistente de **$39,965.42 USD** entre Train RMSE ($12,213.84) y Test RMSE ($52,179.26). En Train el error es de solo 1.56% y se multiplica a 5.44% en Test. |
| **¿Qué tan estable es su desempeño si cambias la porción de datos de entrenamiento?** | **Estabilidad moderada-baja en horizontes cortos; convergente con dispersión de ±$8,153 USD** | En TimeSeriesSplit (5 folds), el RMSE oscila entre $31,933.34 USD (Fold 1) y $57,232.59 USD (Fold 3). La métrica agregada es **$45,601.03 ± $8,153.07 USD**. |
| **¿Cuál es la acción correctiva específica recomendada?** | **Descomposición híbrida de tendencia (Diferenciación / Regresión Ridge) + Regularización de poda en Random Forest** | Resolver la limitación matemática de los árboles de decisión para extrapolar crecimiento compuesto fuera del rango histórico de Train. |

---

## 2. Evidencia de la Curva de Aprendizaje (`learning_curve.png`)

La curva de aprendizaje generada en `data/eval/learning_curve.png` muestra el comportamiento del error cuadrático medio (RMSE) a medida que el conjunto de entrenamiento se expande desde 24 meses (2 años) hasta 96 meses (8 años completos), evaluado contra el set de comprobación (2024-2025):

| Tamaño Train | Duración Histórica | Train RMSE (USD) | Val / Test RMSE (USD) | Brecha de Generalización |
|---|---|---|---|---|
| **24 meses** | 2016 - 2017 (2 años) | $13,995.85 | $207,428.98 | $193,433.13 USD |
| **36 meses** | 2016 - 2018 (3 años) | $10,670.59 | $185,546.86 | $174,876.27 USD |
| **48 meses** | 2016 - 2019 (4 años) | $11,453.35 | $118,567.65 | $107,114.30 USD |
| **60 meses** | 2016 - 2020 (5 años) | $12,850.52 | $101,973.00 | $89,122.48 USD |
| **72 meses** | 2016 - 2021 (6 años) | $11,800.01 | $74,521.67 | $62,721.66 USD |
| **84 meses** | 2016 - 2022 (7 años) | $12,033.69 | $68,939.85 | $56,906.16 USD |
| **96 meses** | 2016 - 2023 (8 años) | $12,213.84 | $52,179.26 | **$39,965.42 USD** |

### Interpretación Estadística:
- **Disminución asintótica del error de validación:** El ingreso de más historial temporal ayuda significativamente a capturar los ciclos estacionales anuales de Nexova (el error baja de $207k a $52k).
- **Invarianza del error de entrenamiento:** El error en Train se mantiene casi plano en ~$11,000–$13,000 USD, lo que demuestra que el modelo tiene capacidad de sobra para memorizar los patrones de entrenamiento.
- **Brecha no convergente:** Aunque el error de validación desciende, la distancia final entre Train y Test es de **$39,965.42 USD** (más del triple). Esto confirma de manera concluyente un escenario de **Overfitting**, descartando por completo el underfitting (en el cual ambas curvas convergerían en un error elevado).

---

## 3. Validación Cruzada Temporal (`TimeSeriesSplit` — 5 Folds)

Para evaluar la estabilidad sin violar la causalidad temporal ni incurrir en fuga de datos (*data leakage*), se utilizó `TimeSeriesSplit` sobre los 8 años de entrenamiento (96 meses). El escalador estadístico (`StandardScaler`) fue ajustado estrictamente sobre el bloque de entrenamiento de cada fold:

| Fold | Rango Train (Meses) | Rango Val (Meses) | Train RMSE | Val RMSE | Val MAE | Val R² |
|---|---|---|---|---|---|---|
| **Fold 1** | 2016-01 a 2017-04 (16 m) | 2017-05 a 2018-08 (16 m) | $19,895.69 | $31,933.34 | $26,251.85 | 0.8172 |
| **Fold 2** | 2016-01 a 2018-08 (32 m) | 2018-09 a 2019-12 (16 m) | $11,323.56 | $44,026.90 | $35,162.74 | 0.6794 |
| **Fold 3** | 2016-01 a 2019-12 (48 m) | 2020-01 a 2021-04 (16 m) | $11,453.35 | $57,232.59 | $42,852.83 | 0.6709 |
| **Fold 4** | 2016-01 a 2021-04 (64 m) | 2021-05 a 2022-08 (16 m) | $12,958.69 | $48,202.63 | $43,157.98 | 0.5950 |
| **Fold 5** | 2016-01 a 2022-08 (80 m) | 2022-09 a 2023-12 (16 m) | $11,872.73 | $46,609.72 | $38,846.00 | 0.7275 |

### Métricas Agregadas de Validación Cruzada:
- **RMSE de Validación:** **$45,601.03 ± $8,153.07 USD**
- **MAE de Validación:** **$37,254.28 ± $6,231.51 USD**
- **R² de Validación:** **0.6980 ± 0.0732**
- **RMSE de Entrenamiento:** $13,500.80 ± $3,248.74 USD
- **MAE de Entrenamiento:** $10,272.97 ± $1,956.29 USD

El coeficiente de determinación medio ($R^2 \approx 0.70$) demuestra que el modelo captura el 70% de la variabilidad de ventas, pero la desviación típica de ±$8,153 USD en RMSE revela que el desempeño fluctúa dependiendo de en qué fase del ciclo de crecimiento o estacionalidad caiga la ventana evaluada.

---

## 4. Análisis de Negocio y Justificación de Métricas (MAE vs. RMSE)

### Métricas Globales Train vs. Test:
- **Conjunto de Entrenamiento (2016-2023, 96 meses):**
  - Ingreso Promedio Mensual: **$784,425.12 USD**
  - MAE: **$8,942.56 USD** (1.14% del ingreso promedio)
  - RMSE: **$12,213.84 USD** (1.56% del ingreso promedio)
- **Conjunto de Prueba / Test (2024-2025, 24 meses):**
  - Ingreso Promedio Mensual: **$959,363.25 USD**
  - MAE: **$44,016.20 USD** (4.59% del ingreso promedio)
  - RMSE: **$52,179.26 USD** (5.44% del ingreso promedio)

### Justificación de Negocio: ¿Por qué RMSE es la métrica principal para Nexova?
1. **Penalización Cuadrática del Riesgo de Tesorería:**
   El MAE ($44,016 USD) refleja la desviación promedio esperada en un mes ordinario. Sin embargo, para Laura (CEO) y la dirección financiera, **un error puntual grande es infinitamente más destructivo que múltiples errores pequeños**. Errar por $15,000 USD se gestiona con el colchón operativo de caja; errar por $111,000 USD (como ocurre en Enero 2025) compromete compromisos contractuales fijos. El RMSE penaliza exponencialmente las colas de la distribución de error, siendo el verdadero termómetro del riesgo financiero.

2. **Asimetría de Costos: Sobreestimar vs. Subestimar:**
   - **Sobreestimar en Agosto (Mes Valle):**  
     Agosto es el mes más crítico para Nexova debido al receso corporativo y vacaciones en España (-15% a -25% de ingresos). En el período de prueba:
     - En **Agosto 2024**, el ingreso real fue de $736,475.98 USD y el modelo predijo $785,096.70 USD (**Sobreestimación de +$48,620.72 USD**).
     - En **Agosto 2025**, el ingreso real fue de $819,255.69 USD y el modelo predijo $846,048.88 USD (**Sobreestimación de +$26,793.19 USD**).  
     *Impacto de Negocio:* Sobreestimar ingresos en un mes contractualmente deprimido lleva a planificar contrataciones y compromisos de gasto en infraestructura bajo una expectativa de caja ficticia, generando un déficit operativo inmediato.
   - **Subestimar en Enero (Pico de Renovaciones):**  
     En **Enero 2025**, el ingreso real alcanzó un récord de $1,145,988.88 USD mientras que el modelo pronosticó $1,034,954.34 USD (**Subestimación de -$111,034.54 USD**).  
     *Causa Técnica:* Los algoritmos basados en árboles de decisión realizan particiones ortogonales y no pueden extrapolar tendencias crecientes lineales fuera del rango máximo visto en los 8 años de entrenamiento ($800k–$900k).

---

## 5. Acción Correctiva Concreta y Específica

Para resolver el overfitting y la incapacidad de extrapolación detectados, se recomienda formalmente la siguiente arquitectura correctiva antes de promover el modelo a staging:

1. **Descomposición de Tendencia y Estacionalidad (Modelo Híbrido):**
   - **Causa Raíz:** Random Forest no extrapola tendencias crecientes porque asigna a cualquier dato futuro el promedio del nodo hoja más cercano del pasado.
   - **Solución Concreta:** Diferenciar la serie de ventas ($\Delta y_t = y_t - y_{t-12}$ o remover la tendencia determinista con una regresión Ridge sobre `time_index`). Entrenar el Random Forest **únicamente sobre los residuos desestacionalizados**, permitiendo que la tendencia crezca naturalmente a largo plazo.

2. **Regularización y Poda del Ensamble:**
   - **Causa Raíz:** Árboles con `max_depth=6` y `min_samples_split=4` tienen libertad excesiva para memorizar micro-variaciones de los 96 meses de entrenamiento.
   - **Solución Concreta:** 
     - Reducir `max_depth` a **4**.
     - Aumentar `min_samples_leaf` a **3** y `min_samples_split` a **8**.
     - Configurar `max_features='sqrt'` para descorrelacionar aún más los estimadores del bosque.

3. **Inclusión de Lags Explícitos con Ventana Móvil:**
   - Incorporar features autorregresivos estrictos como `lag_12` (mismo mes del año anterior) y `rolling_mean_3` calculados causalmente, evitando que el modelo dependa exclusivamente de variables de calendario estáticas.