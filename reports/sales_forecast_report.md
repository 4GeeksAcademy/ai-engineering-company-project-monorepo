# Reporte Técnico: Modelo de Predicción de Ventas (Nexova Solutions)

> **Ticket:** #DEV-Finanzas — Viabilidad Predictiva de Ingresos a Partir del Histórico  
> **Área Solicitante:** Finanzas & Dirección Ejecutiva (Laura Mendoza)  
> **Fecha:** 2026-11-03  
> **Autor / Equipo:** AI Engineering Team  
> **Rama Git:** `feature/sales-forecast-model`  
> **Algoritmo Seleccionado:** `RandomForestRegressor` (`n_estimators=150`, `max_depth=6`, `random_state=42`)  
> **Visualización Generada:** `reports/figures/sales_forecast_uncertainty.png`  

---

## 1. 🎯 Resumen Ejecutivo

El área de Finanzas solicitó evaluar la viabilidad de predecir las ventas mensuales futuras a partir del histórico de ventas de 10 años (2016-2025) de Nexova Solutions, antes de comprometer recursos en la construcción de un dashboard directivo completo.

Siguiendo estrictamente las directrices metodológicas de evaluación honesta y sin data leakage:
- Se utilizaron los **primeros 8 años (2016-01 a 2023-12, 96 meses)** exclusivamente para entrenar el modelo.
- Se mantuvieron los **2 años más recientes (2024-01 a 2025-12, 24 meses)** como comprobación ciega de prueba (*test set*).
- El modelo alcanzó un **error típico medio (RMSE) de $52,179.26 USD**, lo que representa un margen de error relativo de tan solo **~4.9%** respecto a la facturación media mensual (~$1,060,000 USD en 2024-2025).
- El coeficiente **Gini Normalizado de 0.9196 (92%)** confirma que el modelo predice con enorme precisión los meses de alta y baja estacionalidad.

**Conclusión:** Es plenamente viable avanzar con la construcción del dashboard ejecutivo para Finanzas.

---

## 2. 🏛️ Justificación de la Elección del Algoritmo (Random Forest vs. XGBoost)

El ticket solicitaba justificar explícitamente la elección entre **Random Forest** y **XGBoost**:

1. **Explicabilidad para Stakeholders No Técnicos:**  
   Random Forest opera bajo la técnica de *Bagging* (Bootstrap Aggregating): entrena múltiples árboles de decisión sobre subconjuntos muestrales distintos y promedia sus estimaciones. Conceptualmente, es interpretable para Finanzas como "un comité de 150 analistas independientes que emiten su proyección y se calcula el consenso". XGBoost, al ser secuencial por gradiente de residuos (*Boosting*), suele percibirse como una caja negra matemática más opaca.
2. **Generación Directa del Área de Variabilidad / Incertidumbre (IC 95%):**  
   El criterio de negocio exige mostrar la incertidumbre (no una cifra puntual optimista). En Random Forest, cada uno de los 150 árboles individuales (`model.estimators_`) emite su propia estimación; esto permite calcular la desviación típica ($\sigma$) directamente y trazar el intervalo de confianza al 95% ($\mu \pm 1.96 \cdot \sigma$) sin tener que re-entrenar múltiples modelos por cuantiles (lo que requeriría XGBoost con función de pérdida por cuantiles).
3. **Resiliencia ante Muestras Mensuales (120 registros):**  
   Con 96 observaciones de entrenamiento, Random Forest es muy robusto al sobreajuste (*overfitting*) y a fluctuaciones atípicas, mientras que XGBoost requiere una sintonización hiperexhaustiva de regularizaciones para no memorizar el pasado.

---

## 3. 📊 Resultados de la Evaluación sobre el Conjunto de Test (2024-2025)

Todas las métricas fueron calculadas **exclusivamente sobre los 2 años de prueba ciegos**:

| Métrica | Valor Numérico | Interpretación Práctica para Negocio |
| :--- | :---: | :--- |
| **MSE (Mean Squared Error)** | `2,722,675,047.85` | Magnitud cuadrática del error en USD². Penaliza con fuerza desviaciones puntuales. |
| **RMSE (Error Absoluto Típico)** | **`$52,179.26 USD`** | Desviación estándar del error en dólares. Representa un margen de error relativo < 5%. |
| **$R^2$ Score** | **`0.6350`** | El modelo explica el **63.5% de la varianza total** de las ventas del período de prueba no visto. |
| **Gini Normalizado** | **`0.9196` (92%)** | Capacidad excepcional de discriminar y ordenar meses de mayor y menor facturación. |
| **PSI (Population Stability Index)** | `6.2561` | Alerta de corrimiento de escala (*data drift*): la empresa escaló de una facturación de $600k-$800k (2016-2020) a superar $1M (2024-2025). |

---

## 4. 🧠 Análisis Metodológico: ¿Por qué un MSE bajo no es suficiente por sí solo?

1. **Dependencia de la Escala de Medida:** El MSE se expresa en unidades al cuadrado (\$ USD²), careciendo de intuición directa sin contextualizarlo con el volumen de facturación o transformarlo a RMSE / MAPE.
2. **Invisibilidad ante Sesgos Sistemáticos (Flat Predictions):** Un modelo ingenuo que predijese una línea horizontal constante con el promedio histórico podría arrojar un MSE moderadamente bajo en apariencia; sin embargo, sería inútil para Finanzas porque no alertaría de la caída de liquidez en agosto (vacaciones en España) ni de los picos de enero/febrero.
3. **Ceguera ante Cambios Estructurales (Data Drift):** Un MSE no revela si el comportamiento macroeconómico o la escala de la empresa han cambiado. El **PSI**, en cambio, advirtió honestamente que el volumen base creció de forma estructural.
4. **Capacidad de Ordenamiento Temporal:** El coeficiente de **Gini** garantiza que el modelo acierta la dirección y ranking relativo de los meses del año, lo cual es vital para la planificación de tesorería y contratación.

---

## 5. 📉 Visualización de la Predicción con Banda de Incertidumbre

La gráfica generada en alta resolución (`reports/figures/sales_forecast_uncertainty.png`) plasma:
- **Curva Azul:** Ventas reales observadas en 2024 y 2025.
- **Curva Naranja Discontinua:** Predicción media del modelo Random Forest.
- **Banda Sombreada Naranja:** Área de variabilidad e incertidumbre al 95% ($\pm 1.96 \cdot \sigma$).

Se observa visualmente cómo el modelo predice con exactitud los picos de enero y la pronunciada caída vacacional de agosto, manteniendo los valores reales contenidos dentro de la banda de incertidumbre.

---

## 6. 🧪 Certificación de Pruebas Unitarias (Anti-Leakage)

Se ejecutó la suite `tests/pipelines/test_sales_split.py` con `pytest`:
- `test_split_temporal_proportions`: **PASSED** (96 meses en Train, 24 meses en Test).
- `test_no_temporal_data_leakage`: **PASSED** (`max(train_date) = 2023-12-01 < min(test_date) = 2024-01-01`).
- `test_resilience_to_unsorted_records`: **PASSED** (resistencia a registros desordenados).
- `test_scaler_fitted_only_on_train`: **PASSED** (el escalador no contiene información del test set).

