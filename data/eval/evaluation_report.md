# TrackFlow — evaluación temporal del modelo

## Diseño experimental

Se evaluó exclusivamente el conjunto de entrenamiento de 2016–2023 (96 observaciones). La validación usa `TimeSeriesSplit(n_splits=5)`, sin mezcla aleatoria; los años 2024–2025 permanecen intactos como prueba final.

## Métricas por fold

| Fold | Train MAE | Validation MAE | Train RMSE | Validation RMSE |
|---:|---:|---:|---:|---:|
| 1 | 22,117.20 | 33,986.46 | 29,936.40 | 47,483.59 |
| 2 | 12,809.48 | 54,381.27 | 17,540.97 | 81,135.91 |
| 3 | 12,248.12 | 36,685.39 | 19,503.37 | 49,796.87 |
| 4 | 10,654.42 | 40,119.72 | 14,843.52 | 56,879.67 |
| 5 | 10,230.98 | 75,556.21 | 14,786.79 | 97,179.72 |

| **Mean ± std** | **13,612.04 ± 4,359.38** | **48,145.81 ± 15,404.27** | **19,322.21 ± 5,594.56** | **66,495.15 ± 19,435.14** |

## Métrica primaria

Se elige **RMSE** como métrica primaria porque una gran subestimación de meses de alta demanda puede provocar falta de capacidad y problemas operativos; RMSE penaliza más esos errores grandes. MAE se conserva como medida complementaria interpretable en euros.

## Diagnóstico de ajuste

La curva completa está en [`learning_curve.png`](learning_curve.png). El diagnóstico es **overfitting**. La curva RMSE termina con una brecha de 138,431.78 EUR entre validación y entrenamiento; junto con una desviación temporal de 19,435.14 EUR, la evidencia apunta a varianza alta.

## Estabilidad temporal

La validación RMSE es **66,495.15 ± 19,435.14 EUR** y la validación MAE es **48,145.81 ± 15,404.27 EUR**. La desviación estándar se reporta porque un promedio único ocultaría diferencias entre periodos históricos.

## Acción correctiva

Para el diagnóstico observado, se recomienda **Reducir la varianza del Random Forest en el siguiente experimento: aumentar `min_samples_leaf` de 2 a 8 y limitar `max_depth` a 6; comparar el cambio con la misma CV temporal antes de seleccionar el modelo final.** Esta acción se valida con la misma división temporal; no se debe usar `KFold` aleatorio ni tocar los años 2024–2025 durante la selección.
