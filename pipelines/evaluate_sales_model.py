"""Evaluate TrackFlow's sales model with temporal cross-validation."""

from __future__ import annotations

import argparse
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
from sklearn.model_selection import TimeSeriesSplit, learning_curve
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from pipelines.train_sales_model import SEED, _features, load_sales, split_by_year

ROOT = Path(__file__).resolve().parents[1]
EVAL_DIR = ROOT / "data" / "eval"
N_SPLITS = 5


def make_model() -> Pipeline:
    """Build the same leakage-safe model used by the forecasting pipeline."""
    return Pipeline(
        [
            ("scaler", StandardScaler()),
            (
                "model",
                RandomForestRegressor(
                    n_estimators=300,
                    random_state=SEED,
                    min_samples_leaf=2,
                ),
            ),
        ]
    )


def temporal_cv_metrics(
    x_train: pd.DataFrame, y_train: pd.Series, n_splits: int = N_SPLITS
) -> pd.DataFrame:
    """Return train/validation MAE and RMSE for chronological folds."""
    splitter = TimeSeriesSplit(n_splits=n_splits)
    rows: list[dict[str, float | int]] = []
    values = y_train.to_numpy()
    for fold, (train_idx, val_idx) in enumerate(splitter.split(x_train), start=1):
        model = make_model()
        model.fit(x_train.iloc[train_idx], values[train_idx])
        train_prediction = model.predict(x_train.iloc[train_idx])
        val_prediction = model.predict(x_train.iloc[val_idx])
        rows.append(
            {
                "fold": fold,
                "train_size": len(train_idx),
                "validation_size": len(val_idx),
                "train_mae": mean_absolute_error(values[train_idx], train_prediction),
                "validation_mae": mean_absolute_error(values[val_idx], val_prediction),
                "train_rmse": root_mean_squared_error(values[train_idx], train_prediction),
                "validation_rmse": root_mean_squared_error(values[val_idx], val_prediction),
            }
        )
    return pd.DataFrame(rows)


def learning_curve_metrics(
    x_train: pd.DataFrame, y_train: pd.Series, n_splits: int = N_SPLITS
) -> dict[str, np.ndarray]:
    """Calculate chronological learning curves for MAE and RMSE."""
    splitter = TimeSeriesSplit(n_splits=n_splits)
    sizes, train_mae, validation_mae = learning_curve(
        make_model(), x_train, y_train, cv=splitter,
        train_sizes=np.linspace(0.2, 1.0, 5),
        scoring="neg_mean_absolute_error", n_jobs=1, shuffle=False,
    )
    _, train_rmse, validation_rmse = learning_curve(
        make_model(), x_train, y_train, cv=splitter,
        train_sizes=np.linspace(0.2, 1.0, 5),
        scoring="neg_root_mean_squared_error", n_jobs=1, shuffle=False,
    )
    return {
        "sizes": sizes,
        "train_mae": -train_mae.mean(axis=1),
        "validation_mae": -validation_mae.mean(axis=1),
        "train_rmse": -train_rmse.mean(axis=1),
        "validation_rmse": -validation_rmse.mean(axis=1),
    }


def save_learning_curve(curve: dict[str, np.ndarray], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    figure, axes = plt.subplots(1, 2, figsize=(12, 5))
    for axis, metric in zip(axes, ("mae", "rmse")):
        axis.plot(curve["sizes"], curve[f"train_{metric}"], marker="o", label="Train")
        axis.plot(curve["sizes"], curve[f"validation_{metric}"], marker="o", label="Validation")
        axis.set_title(metric.upper())
        axis.set_xlabel("Training observations")
        axis.set_ylabel("Error (EUR)")
        axis.grid(alpha=0.25)
        axis.legend()
    figure.suptitle("TrackFlow temporal learning curve")
    figure.tight_layout()
    figure.savefig(path, dpi=150)
    plt.close(figure)


def _diagnose(curve: dict[str, np.ndarray], cv: pd.DataFrame) -> tuple[str, str]:
    train_end = float(curve["train_rmse"][-1])
    validation_end = float(curve["validation_rmse"][-1])
    gap = validation_end - train_end
    validation_std = float(cv["validation_rmse"].std(ddof=0))
    if gap > max(train_end * 0.35, 1.0):
        return "overfitting", (
            f"La curva RMSE termina con una brecha de {gap:,.2f} EUR entre validación "
            f"y entrenamiento; junto con una desviación temporal de {validation_std:,.2f} EUR, "
            "la evidencia apunta a varianza alta."
        )
    if train_end > 0 and validation_end > 0 and gap < train_end * 0.15:
        return "bien ajustado", "Las curvas terminan próximas y no muestran una brecha material; la varianza temporal es manejable."
    return "underfitting", "Las curvas permanecen relativamente próximas, pero el error final sigue alto; predomina el sesgo."


def write_report(cv: pd.DataFrame, curve: dict[str, np.ndarray], path: Path) -> None:
    diagnosis, evidence = _diagnose(curve, cv)
    if diagnosis == "overfitting":
        corrective_action = (
            "Reducir la varianza del Random Forest en el siguiente experimento: "
            "aumentar `min_samples_leaf` de 2 a 8 y limitar `max_depth` a 6; "
            "comparar el cambio con la misma CV temporal antes de seleccionar el modelo final."
        )
    elif diagnosis == "underfitting":
        corrective_action = (
            "Mejorar las variables temporales (trimestre y tendencia disponible al pronosticar) "
            "y repetir la misma CV antes de aumentar la complejidad del modelo."
        )
    else:
        corrective_action = (
            "Mantener el modelo como baseline, monitorizar la dispersión temporal y no introducir "
            "cambios de complejidad sin evidencia adicional."
        )
    means = cv.mean(numeric_only=True)
    stds = cv.std(numeric_only=True, ddof=0)
    report = f"""# TrackFlow — evaluación temporal del modelo

## Diseño experimental

Se evaluó exclusivamente el conjunto de entrenamiento de 2016–2023 (96 observaciones). La validación usa `TimeSeriesSplit(n_splits=5)`, sin mezcla aleatoria; los años 2024–2025 permanecen intactos como prueba final.

## Métricas por fold

| Fold | Train MAE | Validation MAE | Train RMSE | Validation RMSE |
|---:|---:|---:|---:|---:|
"""
    for _, row in cv.iterrows():
        report += f"| {int(row['fold'])} | {row['train_mae']:,.2f} | {row['validation_mae']:,.2f} | {row['train_rmse']:,.2f} | {row['validation_rmse']:,.2f} |\n"
    report += f"""
| **Mean ± std** | **{means['train_mae']:,.2f} ± {stds['train_mae']:,.2f}** | **{means['validation_mae']:,.2f} ± {stds['validation_mae']:,.2f}** | **{means['train_rmse']:,.2f} ± {stds['train_rmse']:,.2f}** | **{means['validation_rmse']:,.2f} ± {stds['validation_rmse']:,.2f}** |

## Métrica primaria

Se elige **RMSE** como métrica primaria porque una gran subestimación de meses de alta demanda puede provocar falta de capacidad y problemas operativos; RMSE penaliza más esos errores grandes. MAE se conserva como medida complementaria interpretable en euros.

## Diagnóstico de ajuste

La curva completa está en [`learning_curve.png`](learning_curve.png). El diagnóstico es **{diagnosis}**. {evidence}

## Estabilidad temporal

La validación RMSE es **{means['validation_rmse']:,.2f} ± {stds['validation_rmse']:,.2f} EUR** y la validación MAE es **{means['validation_mae']:,.2f} ± {stds['validation_mae']:,.2f} EUR**. La desviación estándar se reporta porque un promedio único ocultaría diferencias entre periodos históricos.

## Acción correctiva

Para el diagnóstico observado, se recomienda **{corrective_action}** Esta acción se valida con la misma división temporal; no se debe usar `KFold` aleatorio ni tocar los años 2024–2025 durante la selección.
"""
    path.write_text(report, encoding="utf-8")


def evaluate() -> pd.DataFrame:
    frame = load_sales()
    train, _ = split_by_year(frame)
    x_train = _features(train)
    y_train = train["revenue_eur"]
    cv = temporal_cv_metrics(x_train, y_train)
    curve = learning_curve_metrics(x_train, y_train)
    save_learning_curve(curve, EVAL_DIR / "learning_curve.png")
    write_report(cv, curve, EVAL_DIR / "evaluation_report.md")
    return cv


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.parse_args()
    cv = evaluate()
    print(cv.to_string(index=False))


if __name__ == "__main__":
    main()
