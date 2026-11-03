# Predicción de Ventas con un Modelo de Regresión

Antes de empezar: Lee tu [CONTEXT-empresa.md](https://github.com/4GeeksAcademy/ai-engineering-syllabus/tree/main/content/contexts/sales-forecasting) antes de escribir cualquier línea de código — ahí se documenta el significado de cada columna y el patrón de estacionalidad del histórico de ventas de tu empresa, que ya viene incluido como CSV en `content/contexts/sales-forecasting/<empresa>/<empresa>_sales.csv` de este repositorio.

---

## 🎯 Tu reto

📌 Estás construyendo sobre tu copia del [monorepo](https://github.com/4GeeksAcademy/ai-engineering-company-project-monorepo) de la empresa seleccionada al inicio del curso — no en un repositorio nuevo.

Ya preparaste y dividiste los datos históricos de tu empresa en conjuntos de entrenamiento y prueba, y entrenaste un primer modelo de clasificación. Ahora tu tech lead necesita algo distinto: el equipo de Dirección quiere saber cuánto va a vender la empresa en los próximos meses, no solo clasificar un resultado en categorías. Eso es un problema de regresión.

Tu tech lead ha abierto un ticket a partir de una RFI que llegó del área de Finanzas: quieren saber si, con los datos históricos disponibles, es viable predecir el comportamiento futuro de las ventas con un margen de error aceptable antes de comprometerse a construir un dashboard ejecutivo completo alrededor de esto.

### De: Tu tech lead  
**Asunto:** Ticket — Modelo de predicción de ventas

> Finanzas quiere saber si podemos predecir las ventas de los próximos meses a partir del histórico. Antes de prometerles nada, necesito un modelo entrenado y evaluado con honestidad: nada de presumir un error bajo solo porque el modelo memorizó el pasado.

#### Criterios no negociables:
1. **División temporal honesta:** Usa los primeros 8 años de datos para entrenar y los 2 años más recientes como comprobación de la predicción — esos años recientes el modelo no los debe haber visto durante el entrenamiento.
2. **Rango de incertidumbre:** Quiero una visualización que muestre la predicción junto con su rango de variabilidad (no un solo número optimista).
3. **Justificación de modelo:** Justifica por qué elegiste XGBoost o Random Forest para este caso, no asumas que uno es "mejor" sin argumentarlo.
4. **Métrica comprensible para negocio:** Reporta el error con una métrica que yo pueda explicarle a Finanzas sin que parezca una caja negra.

#### Conocimiento complementario:
- **Random Forest:** Entrena muchos árboles de decisión sobre subconjuntos distintos de datos y promedia sus resultados — es más simple de explicar y un buen punto de partida.
- **XGBoost:** Entrena árboles de forma secuencial, donde cada uno corrige los errores del anterior — suele predecir mejor pero es más difícil de explicar y requiere más ajuste.  
*Elige según qué necesita realmente tu stakeholder: explicabilidad o máxima precisión.*

---

## 🌱 Cómo Empezar el Proyecto

1. Si aún no tienes un fork del [monorepo de tu empresa](https://github.com/4GeeksAcademy/ai-engineering-company-project-monorepo), créalo en GitHub. Recomendamos abrir y trabajar ese fork en GitHub Codespaces; si prefieres trabajar en local, clónalo en tu máquina.
2. Desde `main` de tu fork, crea una rama nueva para este proyecto: `git switch -c feature/sales-forecast-model` (en Codespaces o en tu entorno local).
3. Valida que `uv` esté instalado con `uv --version`; si no lo tienes, instálalo con `curl -LsSf https://astral.sh/uv/install.sh | sh` y, en la raíz del proyecto, inicializa el entorno con `uv init` (solo si aún no existe `pyproject.toml`). Luego agrega las dependencias con `uv add` (por ejemplo `scikit-learn`, `xgboost`, `pandas`, `matplotlib`) — **nunca uses `pip install` ni `pipenv`**.
4. Usa el dataset de ventas históricas ya provisto para tu empresa: en el monorepo está en `data/raw/<empresa>_sales.csv` y en este repositorio de referencia en `content/contexts/sales-forecasting/<empresa>/<empresa>_sales.csv`; no lo generes ni lo simules.
5. Lee tu `CONTEXT-empresa.md` completo antes de escribir código: ahí están el significado de cada columna, el rango de fechas y el patrón de estacionalidad que el dataset ya refleja.

---

## 💻 Qué Debes Hacer

### Preparación de datos
- [x] Carga el dataset de ventas históricas de tu empresa desde la ruta correspondiente al entorno donde trabajas: `data/raw/<empresa>_sales.csv` en tu monorepo o `content/contexts/sales-forecasting/<empresa>/<empresa>_sales.csv` en este repositorio de referencia, y verifica que las columnas coincidan con las descritas en tu `CONTEXT-empresa.md`.
- [x] Trata los valores nulos o vacíos antes de entrenar.
- [x] Divide el dataset en **entrenamiento** (los primeros 8 años) y **comprobación/prueba** (los 2 años más recientes), de forma que el modelo nunca vea los años de prueba durante el entrenamiento.
- [x] Escala las variables que lo requieran para evitar comparaciones erróneas entre magnitudes distintas.

### Entrenamiento del modelo
- [x] Entrena un modelo de regresión usando **XGBoost** o **Random Forest** (elige uno y documenta por qué) con `scikit-learn`.
- [x] Documenta en el código o en un comentario el criterio de elección del algoritmo (tamaño de datos, necesidad de explicabilidad, tiempo disponible para ajuste).

### Evaluación
- [x] Calcula y reporta al menos las siguientes métricas sobre el conjunto de prueba: **MSE**, **PSI**, **Gini** y **R2 Score**.
- [x] Explica en el README de tu implementación (o en un comentario) qué mide cada métrica y por qué un MSE bajo no es suficiente por sí solo.

### Visualización
- [x] Genera una visualización que muestre la predicción del modelo junto con el área de variabilidad del resultado, comparada contra los datos reales de los 2 años de prueba.

> ⚠️ **IMPORTANTE:** Los nombres de columnas, el formato del dataset y los valores específicos de tu implementación deben coincidir con lo especificado en tu `CONTEXT.md`. Una implementación genérica que ignore el contexto de tu empresa no será aceptada.

### Pruebas
- [x] Agrega al menos una prueba unitaria en `tests/pipelines/` que valide que el split de entrenamiento/prueba respeta la regla de los 8 años / 2 años y que no hay fuga de datos (*data leakage*) entre ambos conjuntos.

---

## ✅ Qué Evaluaremos

- [x] El split de entrenamiento y prueba respeta la regla 8 años / 2 años y no mezcla datos entre ambos conjuntos.
- [x] El modelo entrenado es XGBoost o Random Forest, con la elección justificada explícitamente.
- [x] Las cuatro métricas (MSE, PSI, Gini, R2 Score) están calculadas y reportadas sobre el conjunto de prueba, no sobre el de entrenamiento.
- [x] Existe una visualización que muestra la predicción junto con su rango de variabilidad, no solo una línea puntual.
- [x] El dataset usado es el provisto en `data/raw/<empresa>_sales.csv`, sin alteraciones que rompan el patrón de estacionalidad y crecimiento descrito en el `CONTEXT.md` de la empresa.
- [x] La semilla aleatoria (`random_state` / `seed`) está fijada para que el experimento sea reproducible.
- [x] La prueba unitaria del split pasa correctamente.

---

## 📦 Cómo Entregar

1. Haz commit de tus cambios con mensajes claros y descriptivos.
2. Sube tu rama a tu fork del monorepo.
3. Abre un **Pull Request** hacia la rama `main` de tu propio fork, describiendo brevemente qué algoritmo elegiste y por qué.
4. Incluye en la descripción del PR las métricas obtenidas sobre el conjunto de prueba.
5. Espera el *review* de tu tech lead antes de hacer merge.

