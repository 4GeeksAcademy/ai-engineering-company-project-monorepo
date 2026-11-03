"""
Módulo de Entrenamiento, Evaluación y Visualización del Modelo de Predicción de Ventas.
Empresa: Nexova Solutions (Ticket de Finanzas).

====================================================================================
JUSTIFICACIÓN DE LA ELECCIÓN DEL ALGORITMO (RANDOM FOREST VS. XGBOOST):
====================================================================================
1. Requerimiento de Explicabilidad para Finanzas:
   El stakeholder (Dirección y Finanzas) exige evitar modelos de 'caja negra'. Random Forest 
   se fundamenta en Bagging (Bootstrap Aggregating): entrena múltiples árboles de decisión 
   independientes sobre subconjuntos aleatorios y promedia sus proyecciones como un comité de expertos.
2. Estimación Directa de la Incertidumbre (Área de Variabilidad):
   A diferencia de XGBoost estándar (que optimiza secuencialmente y requeriría re-entrenar múltiples
   modelos con pérdida de cuantiles para obtener intervalos), Random Forest permite acceder 
   directamente a cada uno de sus árboles individuales (`model.estimators_`), permitiendo calcular 
   la desviación típica muestral (sigma) para trazar el rango de incertidumbre empírico al 95%.
3. Estabilidad y Resiliencia con Datos Mensuales (120 registros):
   Para series con 96 observaciones de entrenamiento, Random Forest es sumamente resistente al 
   sobreajuste (overfitting) frente a gradientes agresivos sin requerir un ajuste hiperexhaustivo.
"""

from pathlib import Path
import sys
from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score

from services.ml.sales_pipeline import (
    load_raw_sales,
    engineer_temporal_features,
    split_train_test_temporal,
    prepare_features,
)

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
from services.ml.sales_pipeline import (
    load_raw_sales,
    engineer_temporal_features,
    split_train_test_temporal,
    prepare_features,
)

# =====================================================================
# CÁLCULO DE MÉTRICAS AVANZADAS
# =====================================================================

def calculate_psi(expected: np.ndarray, actual: np.ndarray, num_buckets: int = 8) -> float:
    """
    Calcula el Population Stability Index (PSI) entre la distribución de ventas esperada (Train)
    y la observada (Test).
    Regla estándar:
    - PSI < 0.10: Distribución estable (sin drift significativo).
    - 0.10 <= PSI <= 0.25: Cambio moderado.
    - PSI > 0.25: Drift poblacional significativo.
    """
    percentiles = np.linspace(0, 100, num_buckets + 1)
    bins = np.percentile(expected, percentiles)
    bins[0] -= 1e-5
    bins[-1] += 1e-5

    expected_counts, _ = np.histogram(expected, bins=bins)
    actual_counts, _ = np.histogram(actual, bins=bins)

    eps = 1e-4
    expected_pct = (expected_counts + eps) / (len(expected) + eps * num_buckets)
    actual_pct = (actual_counts + eps) / (len(actual) + eps * num_buckets)

    psi_val = np.sum((actual_pct - expected_pct) * np.log(actual_pct / expected_pct))
    return float(psi_val)


def calculate_normalized_gini(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """
    Calcula el coeficiente de Gini normalizado para regresión.
    Evalúa la capacidad del modelo para ordenar correctamente las magnitudes de venta.
    """
    def _gini_area(actual, pred):
        n = len(actual)
        indices = np.argsort(pred)
        sorted_actual = actual[indices]
        cumulative_actual = np.cumsum(sorted_actual)
        total = cumulative_actual[-1]
        if total == 0:
            return 0.0
        lorentz = cumulative_actual / total
        equality = np.arange(1, n + 1) / n
        return float(np.sum(lorentz - equality) / n)

    act = np.array(y_true, dtype=float)
    pr = np.array(y_pred, dtype=float)
    g_model = _gini_area(act, pr)
    g_perfect = _gini_area(act, act)
    if g_perfect == 0:
        return 0.0
    return float(g_model / g_perfect)


# =====================================================================
# ENTRENAMIENTO Y PREDICCIÓN CON INCERTIDUMBRE
# =====================================================================

def train_sales_model(
    X_train: pd.DataFrame, 
    y_train: pd.Series, 
    random_state: int = 42
) -> RandomForestRegressor:
    """Entrena un RandomForestRegressor con semilla fija para reproducibilidad."""
    model = RandomForestRegressor(
        n_estimators=150,
        max_depth=6,
        min_samples_split=4,
        random_state=random_state,
        n_jobs=-1
    )
    model.fit(X_train, y_train)
    return model


def predict_with_confidence_interval(
    model: RandomForestRegressor, 
    X_test: pd.DataFrame
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Calcula la predicción media y el intervalo de confianza al 95%
    a partir de las estimaciones individuales de cada árbol del ensamble.
    """
    # Matriz de predicciones: (n_árboles, n_muestras)
    tree_preds = np.array([tree.predict(X_test.values) for tree in model.estimators_])
    mean_pred = np.mean(tree_preds, axis=0)
    std_pred = np.std(tree_preds, axis=0)

    # Intervalo de confianza al 95% (~1.96 desviaciones estándar)
    lower_bound = mean_pred - (1.96 * std_pred)
    upper_bound = mean_pred + (1.96 * std_pred)

    return mean_pred, lower_bound, upper_bound


# =====================================================================
# GENERACIÓN DE VISUALIZACIÓN
# =====================================================================

def generate_forecast_plot(
    test_dates: pd.Series,
    y_test: pd.Series,
    y_pred: np.ndarray,
    lower_bound: np.ndarray,
    upper_bound: np.ndarray,
    output_path: Path = Path("reports/figures/sales_forecast_uncertainty.png")
) -> Path:
    """Genera la visualización de datos reales vs predicción con banda de variabilidad."""
    output_path.parent.mkdir(parents=True, exist_ok=True)

    plt.figure(figsize=(12, 6))
    dates = pd.to_datetime(test_dates)

    # Datos reales de comprobación
    plt.plot(dates, y_test.values, marker="o", color="#1f77b4", linewidth=2.5, label="Ventas Reales (Comprobación 2024-2025)")

    # Predicción puntual del modelo
    plt.plot(dates, y_pred, marker="s", color="#ff7f0e", linestyle="--", linewidth=2.2, label="Predicción Random Forest (Media)")

    # Área sombreada de variabilidad / incertidumbre al 95%
    plt.fill_between(
        dates, 
        lower_bound, 
        upper_bound, 
        color="#ff7f0e", 
        alpha=0.25, 
        label="Rango de Incertidumbre (IC 95%)"
    )

    plt.title("Nexova Solutions: Proyección de Ventas vs. Realidad (Período de Test)", fontsize=14, fontweight="bold", pad=15)
    plt.xlabel("Mes", fontsize=12)
    plt.ylabel("Ingresos Mensuales (USD)", fontsize=12)
    plt.gca().yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f"${x:,.0f}"))
    plt.grid(True, linestyle=":", alpha=0.6)
    plt.legend(loc="upper right", frameon=True, fontsize=10)
    plt.xticks(rotation=45)
    plt.tight_layout()

    plt.savefig(output_path, dpi=300)
    plt.close()
    return output_path


# =====================================================================
# EJECUCIÓN PRINCIPAL
# =====================================================================

def run_forecast_evaluation():
    print("[*] 1. Cargando y preparando dataset de Nexova...")
    raw_df = load_raw_sales()
    featured_df = engineer_temporal_features(raw_df)
    train_df, test_df = split_train_test_temporal(featured_df, cutoff_date="2024-01-01")
    data = prepare_features(train_df, test_df)

    print(f"    Train: {len(data['X_train'])} meses | Test: {len(data['X_test'])} meses")

    print("[*] 2. Entrenando Random Forest Regressor (seed=42)...")
    model = train_sales_model(data["X_train"], data["y_train"], random_state=42)

    print("[*] 3. Generando predicciones e intervalo de confianza al 95%...")
    y_pred, lower_bound, upper_bound = predict_with_confidence_interval(model, data["X_test"])

    # Cálculo de métricas sobre TEST
    y_test = data["y_test"].values
    y_train = data["y_train"].values

    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test, y_pred)
    psi = calculate_psi(expected=y_train, actual=y_test)
    gini = calculate_normalized_gini(y_true=y_test, y_pred=y_pred)

    print("\n========================================================")
    print("📊 REPORTE DE EVALUACIÓN SOBRE CONJUNTO DE PRUEBA (TEST):")
    print("========================================================")
    print(f"  * MSE (Mean Squared Error)      : {mse:,.2f}")
    print(f"  * RMSE (Desviación Típica Error): ${rmse:,.2f} USD")
    print(f"  * R2 Score (Varianza Explicada) : {r2:.4f}")
    print(f"  * PSI (Population Stability)    : {psi:.4f} (Estabilidad de distribución)")
    print(f"  * Gini Normalizado (Ranking)    : {gini:.4f}")
    print("========================================================\n")

    print("[*] 4. Generando visualización con área de variabilidad...")
    plot_path = generate_forecast_plot(
        test_dates=data["test_dates"],
        y_test=data["y_test"],
        y_pred=y_pred,
        lower_bound=lower_bound,
        upper_bound=upper_bound
    )
    print(f"[OK] Visualización guardada en: {plot_path}")

    return {
        "mse": mse,
        "rmse": rmse,
        "r2": r2,
        "psi": psi,
        "gini": gini,
        "plot_path": plot_path
    }


if __name__ == "__main__":
    run_forecast_evaluation()