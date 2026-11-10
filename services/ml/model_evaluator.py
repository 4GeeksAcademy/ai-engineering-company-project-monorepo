"""
Módulo de Evaluación Técnica y Validación Cruzada Temporal.
Empresa: Nexova Solutions.
Módulo: services/ml/model_evaluator.py

Objetivos:
1. Implementar TimeSeriesSplit (5 folds) sin mezcla temporal ni data leakage.
2. Encapsular el ajuste del preprocesamiento (StandardScaler) dentro de cada fold.
3. Reportar MAE, RMSE y R² consolidados como Media ± Desviación Estándar.
"""

from pathlib import Path
import sys
from typing import Dict, Any, List
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.model_selection import TimeSeriesSplit
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Asegurar path de importación
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from services.ml.sales_pipeline import (
    load_raw_sales,
    engineer_temporal_features,
    split_train_test_temporal,
)

FEATURE_COLS = [
    "month_num",
    "quarter",
    "year",
    "time_index",
    "sin_month",
    "cos_month",
    "active_contracts",
    "avg_contract_value_usd",
]
TARGET_COL = "revenue_usd"


def evaluate_time_series_cv(train_df: pd.DataFrame, n_splits: int = 5, random_state: int = 42) -> Dict[str, Any]:
    
    """
    Ejecuta validación cruzada temporal (TimeSeriesSplit) con 5 folds
    sobre el dataset de entrenamiento (8 años / 96 meses).
    
    Garantiza:
    - Orden cronológico estricto: max(train_idx) < min(val_idx).
    - Cero filtración estadística: StandardScaler se ajusta (fit) solo con Train del fold.
    """
    # 1. Asegurar orden cronológico
    df_sorted = train_df.sort_values("month").reset_index(drop=True)
    
    tscv = TimeSeriesSplit(n_splits=n_splits)
    folds_results: List[Dict[str, Any]] = []

    train_maes, val_maes = [], []
    train_rmses, val_rmses = [], []
    train_r2s, val_r2s = [], []

    print("\n========================================================")
    print(f"🔄 EJECUTANDO VALIDACIÓN CRUZADA TEMPORAL ({n_splits} FOLDS)")
    print(f"Dataset de Entrenamiento: {len(df_sorted)} meses (2016 - 2023)")
    print("========================================================")

    for fold_num, (train_idx, val_idx) in enumerate(tscv.split(df_sorted), start=1):
        # Aserción matemática anti-leakage
        assert max(train_idx) < min(val_idx), (
            f"Fuga temporal detectada en fold {fold_num}: "
            f"índice máximo de train ({max(train_idx)}) >= índice mínimo de val ({min(val_idx)})"
        )

        fold_train = df_sorted.iloc[train_idx].copy()
        fold_val = df_sorted.iloc[val_idx].copy()

        train_date_range = f"{fold_train['month'].min().strftime('%Y-%m')} a {fold_train['month'].max().strftime('%Y-%m')}"
        val_date_range = f"{fold_val['month'].min().strftime('%Y-%m')} a {fold_val['month'].max().strftime('%Y-%m')}"

        # 2. Extracción de variables
        X_train_raw = fold_train[FEATURE_COLS]
        y_train = fold_train[TARGET_COL].values

        X_val_raw = fold_val[FEATURE_COLS]
        y_val = fold_val[TARGET_COL].values

        # 3. Escalado aislado: fit SOLO en train_raw del fold
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train_raw)
        X_val_scaled = scaler.transform(X_val_raw)

        # 4. Entrenamiento del modelo
        model = RandomForestRegressor(
            n_estimators=150,
            max_depth=6,
            min_samples_split=4,
            random_state=random_state,
            n_jobs=-1,
        )
        model.fit(X_train_scaled, y_train)

        # 5. Predicción
        pred_train = model.predict(X_train_scaled)
        pred_val = model.predict(X_val_scaled)

        # 6. Cálculo de Métricas
        t_mae = mean_absolute_error(y_train, pred_train)
        v_mae = mean_absolute_error(y_val, pred_val)

        t_rmse = np.sqrt(mean_squared_error(y_train, pred_train))
        v_rmse = np.sqrt(mean_squared_error(y_val, pred_val))

        t_r2 = r2_score(y_train, pred_train)
        v_r2 = r2_score(y_val, pred_val)

        train_maes.append(t_mae)
        val_maes.append(v_mae)
        train_rmses.append(t_rmse)
        val_rmses.append(v_rmse)
        train_r2s.append(t_r2)
        val_r2s.append(v_r2)

        fold_info = {
            "fold": fold_num,
            "train_size": len(fold_train),
            "val_size": len(fold_val),
            "train_range": train_date_range,
            "val_range": val_date_range,
            "train_mae": t_mae,
            "val_mae": v_mae,
            "train_rmse": t_rmse,
            "val_rmse": v_rmse,
            "train_r2": t_r2,
            "val_r2": v_r2,
        }
        folds_results.append(fold_info)

        print(f"\n[Fold {fold_num}]")
        print(f"  • Train: {len(fold_train):2d} meses ({train_date_range})")
        print(f"  • Val  : {len(fold_val):2d} meses ({val_date_range})")
        print(f"  • Train RMSE: ${t_rmse:,.2f} USD | Val RMSE: ${v_rmse:,.2f} USD")
        print(f"  • Train MAE : ${t_mae:,.2f} USD | Val MAE : ${v_mae:,.2f} USD")
        print(f"  • Val R²    : {v_r2:.4f}")

    # 7. Métricas consolidadas
    summary = {
        "n_splits": n_splits,
        "train_mae_mean": float(np.mean(train_maes)),
        "train_mae_std": float(np.std(train_maes)),
        "val_mae_mean": float(np.mean(val_maes)),
        "val_mae_std": float(np.std(val_maes)),
        "train_rmse_mean": float(np.mean(train_rmses)),
        "train_rmse_std": float(np.std(train_rmses)),
        "val_rmse_mean": float(np.mean(val_rmses)),
        "val_rmse_std": float(np.std(val_rmses)),
        "train_r2_mean": float(np.mean(train_r2s)),
        "train_r2_std": float(np.std(train_r2s)),
        "val_r2_mean": float(np.mean(val_r2s)),
        "val_r2_std": float(np.std(val_r2s)),
        "folds": folds_results,
    }

    print("\n========================================================")
    print("📈 RESULTADOS CONSOLIDADOS DE VALIDACIÓN CRUZADA (MEDIA ± STD)")
    print("========================================================")
    print(f"  * Validación RMSE : ${summary['val_rmse_mean']:,.2f} ± ${summary['val_rmse_std']:,.2f} USD")
    print(f"  * Validación MAE  : ${summary['val_mae_mean']:,.2f} ± ${summary['val_mae_std']:,.2f} USD")
    print(f"  * Validación R²   : {summary['val_r2_mean']:.4f} ± {summary['val_r2_std']:.4f}")
    print(f"  * Train RMSE      : ${summary['train_rmse_mean']:,.2f} ± ${summary['train_rmse_std']:,.2f} USD")
    print(f"  * Train MAE       : ${summary['train_mae_mean']:,.2f} ± ${summary['train_mae_std']:,.2f} USD")
    print("========================================================\n")

    return summary


def generate_learning_curve(train_df: pd.DataFrame, test_df: pd.DataFrame, output_path: Path = Path("data/eval/learning_curve.png"), random_state: int = 42,) -> Path:
    """
    Genera la Curva de Aprendizaje evaluando el desempeño (RMSE) a medida que
    crece progresivamente el tamaño del set de entrenamiento (desde 24 hasta 96 meses).
    Guarda la gráfica resultante en data/eval/learning_curve.png.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    train_sorted = train_df.sort_values("month").reset_index(drop=True)
    test_sorted = test_df.sort_values("month").reset_index(drop=True)
    # Tamaños de muestra progresivos: 24, 36, 48, 60, 72, 84 y 96 meses
    sizes = [24, 36, 48, 60, 72, 84, 96]
    train_rmses: List[float] = []
    val_rmses: List[float] = []
    print("\n========================================================")
    print("📉 GENERANDO CURVA DE APRENDIZAJE (SESGO vs. VARIANZA)")
    print("========================================================")
    for s in sizes:
        sub_train = train_sorted.iloc[:s].copy()
        # Preprocesamiento aislado por tamaño
        scaler = StandardScaler()
        X_tr = scaler.fit_transform(sub_train[FEATURE_COLS])
        y_tr = sub_train[TARGET_COL].values
        X_val = scaler.transform(test_sorted[FEATURE_COLS])
        y_val = test_sorted[TARGET_COL].values
        # Entrenamiento con hiperparámetros de producción
        model = RandomForestRegressor(
            n_estimators=150,
            max_depth=6,
            min_samples_split=4,
            random_state=random_state,
            n_jobs=-1,
        )
        model.fit(X_tr, y_tr)
        # Predicciones y cálculo de RMSE
        pred_tr = model.predict(X_tr)
        pred_val = model.predict(X_val)
        rmse_tr = float(np.sqrt(mean_squared_error(y_tr, pred_tr)))
        rmse_val = float(np.sqrt(mean_squared_error(y_val, pred_val)))
        train_rmses.append(rmse_tr)
        val_rmses.append(rmse_val)
        print(f"  • Tamaño Train: {s:2d} meses ({s//12} años) | Train RMSE: ${rmse_tr:,.2f} | Val RMSE: ${rmse_val:,.2f}")
    # Graficar la Curva de Aprendizaje
    plt.figure(figsize=(11, 6))
    plt.plot(
        sizes,
        train_rmses,
        marker="o",
        color="#2ca02c",
        linewidth=2.5,
        label="Error de Entrenamiento (Train RMSE)",
    )
    plt.plot(
        sizes,
        val_rmses,
        marker="s",
        color="#d62728",
        linewidth=2.5,
        linestyle="--",
        label="Error de Validación / Test (Val RMSE)",
    )
    # Sombrear la brecha de varianza (overfitting gap)
    plt.fill_between(
        sizes,
        train_rmses,
        val_rmses,
        color="#ff7f0e",
        alpha=0.18,
        label="Brecha de Generalización (Overfitting Gap)",
    )
    # Anotación diagnóstica
    final_gap = val_rmses[-1] - train_rmses[-1]
    plt.annotate(
        f"Brecha persistente: ${final_gap:,.0f} USD\n(Diagnóstico: Overfitting / Alta Varianza)",
        xy=(sizes[-1], (val_rmses[-1] + train_rmses[-1]) / 2),
        xytext=(sizes[-2] - 5, (val_rmses[-1] + train_rmses[-1]) / 2 + 30000),
        arrowprops=dict(facecolor="#333333", shrink=0.08, width=1.5, headwidth=8),
        fontsize=10,
        fontweight="bold",
        bbox=dict(boxstyle="round,pad=0.5", facecolor="#fff2cc", edgecolor="#d6b656"),
    )
    plt.title(
        "Nexova Solutions: Curva de Aprendizaje del Modelo de Ventas (Random Forest)",
        fontsize=13,
        fontweight="bold",
        pad=15,
    )
    plt.xlabel("Tamaño del Conjunto de Entrenamiento (Meses)", fontsize=11)
    plt.ylabel("Error Cuadrático Medio (RMSE en USD)", fontsize=11)
    plt.gca().yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f"${x:,.0f}"))
    plt.xticks(sizes, [f"{s} m\n({s//12}a)" for s in sizes])
    plt.grid(True, linestyle=":", alpha=0.6)
    plt.legend(loc="upper right", frameon=True, fontsize=10)
    plt.tight_layout()
    plt.savefig(output_path, dpi=300)
    plt.close()
    print(f"\n[OK] Gráfico de Curva de Aprendizaje guardado en: {output_path}")
    return output_path

def evaluate_business_metrics( train_df: pd.DataFrame, test_df: pd.DataFrame, random_state: int=42) -> Dict[str, Any]:
    """
    Calcula las métricas consolidadas de negocio (MAE y RMSE) para Train y Test,
    evaluando el impacto económico en USD y en porcentaje del ingreso medio,
    así como el comportamiento en meses críticos de estacionalidad (Agosto y Enero).
    """
    scaler= StandardScaler()
    X_tr= scaler.fit_transform(train_df[FEATURE_COLS])
    y_tr = train_df[TARGET_COL].values

    X_te= scaler.transform(test_df[FEATURE_COLS])
    y_te= test_df[TARGET_COL].values

    model = RandomForestRegressor(
        n_estimators=150,
        max_depth= 6,
        min_samples_split= 4,
        random_state=random_state,
        n_jobs=-1,
    )
    model.fit(X_tr, y_tr)

    pred_tr= model.predict(X_tr)
    pred_te= model.predict(X_te)

    tr_mae= float(mean_absolute_error(y_tr,pred_tr))
    tr_rmse= float(np.sqrt(mean_squared_error(y_tr, pred_tr)))
    te_mae= float(mean_absolute_error(y_te, pred_te))
    te_rmse= float(np.sqrt(mean_squared_error(y_te, pred_te)))

    mean_rev_tr = float(np.mean(y_tr))
    mean_rev_te = float(np.mean(y_te))

    diff= pred_te - y_te
    over_mask= diff > 0
    under_mask= diff < 0

    print("\n========================================================")
    print("💼 ANÁLISIS DE MÉTRICAS DE NEGOCIO Y FINANZAS (NEXOVA)")
    print("========================================================")
    print("🔹 Conjunto de Entrenamiento (2016-2023, 96 meses):")
    print(f"   • Ingreso Promedio Mensual : ${mean_rev_tr:,.2f} USD")
    print(f"   • Train MAE  : ${tr_mae:,.2f} USD ({tr_mae / mean_rev_tr * 100:.2f}% del ingreso medio)")
    print(f"   • Train RMSE : ${tr_rmse:,.2f} USD ({tr_rmse / mean_rev_tr * 100:.2f}% del ingreso medio)")
    print("\n🔹 Conjunto de Prueba / Test (2024-2025, 24 meses):")
    print(f"   • Ingreso Promedio Mensual : ${mean_rev_te:,.2f} USD")
    print(f"   • Test MAE   : ${te_mae:,.2f} USD ({te_mae / mean_rev_te * 100:.2f}% del ingreso medio)")
    print(f"   • Test RMSE  : ${te_rmse:,.2f} USD ({te_rmse / mean_rev_te * 100:.2f}% del ingreso medio)")
    print(f"\n🔹 Asimetría de Pronóstico:")
    print(f"   • Meses Sobreestimados (Pred > Real) : {np.sum(over_mask):2d} de 24 meses (Desvío Promedio: +${np.mean(diff[over_mask]):,.2f} USD)")
    print(f"   • Meses Subestimados  (Pred < Real) : {np.sum(under_mask):2d} de 24 meses (Desvío Promedio: -${np.abs(np.mean(diff[under_mask])):,.2f} USD)")

    test_copy= test_df.copy()
    test_copy["pred"]= pred_te
    test_copy["diff"]= diff
    print("\n🔹 Impacto en Meses Críticos de Estacionalidad (Agosto y Enero):")
    for _, r in test_copy[test_copy["month"].dt.month.isin([1, 8])].iterrows():
        m_str = r["month"].strftime("%Y-%m (%B)")
        print(f"   • {m_str}: Real=${r['revenue_usd']:,.2f} | Pred=${r['pred']:,.2f} | Desvío=${r['diff']:+,.2f} USD")
    print("========================================================\n")

    return {
        "train_mae": tr_mae,
        "train_rmse": tr_rmse,
        "test_mae": te_mae,
        "test_rmse": te_rmse,
        "mean_rev_train": mean_rev_tr,
        "mean_rev_test": mean_rev_te,
        "overestimated_months": int(np.sum(over_mask)),
        "underestimated_months": int(np.sum(under_mask)),
    }


if __name__ == "__main__":
    raw_df = load_raw_sales()
    featured_df = engineer_temporal_features(raw_df)
    train_df, test_df = split_train_test_temporal(featured_df, cutoff_date="2024-01-01")
    # 1. Validación Cruzada Temporal
    evaluate_time_series_cv(train_df, n_splits=5)
    # 2. Generación de Curva de Aprendizaje
    generate_learning_curve(train_df, test_df)
    # 3. Métricas de Negocio (Train vs. Test y Estacionalidad)
    evaluate_business_metrics(train_df, test_df)