"""
Módulo de Preprocesamiento y División Temporal para Predicción de Ventas.
Empresa: Nexova Solutions.
Garantiza:
- Cero Data Leakage (el escalador y los parámetros se aprenden solo de Train).
- Split temporal estricto 8 años (Train: 2016-2023) / 2 años (Test: 2024-2025).
- Enriquecimiento con variables de estacionalidad cíclica.
"""

from pathlib import Path
from typing import Tuple, Dict, Any
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler


def load_raw_sales(csv_path: str | Path = "data/raw/nexova_sales.csv") -> pd.DataFrame:
    """Carga y valida el dataset de ventas de Nexova."""
    path = Path(csv_path)
    if not path.exists():
        raise FileNotFoundError(f"No se encontró el archivo de ventas en: {path}")

    df = pd.read_csv(path)
    df["month"] = pd.to_datetime(df["month"])
    df = df.sort_values("month").reset_index(drop=True)
    return df


def engineer_temporal_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Genera características temporales y cíclicas para modelar estacionalidad y tendencia.
    - month_num: 1 a 12
    - quarter: 1 a 4
    - year: tendencia a largo plazo
    - sin_month / cos_month: codificación circular continua para que dic (12) y ene (1) sean cercanos.
    """
    df = df.copy()
    months = df["month"].dt.month
    df["month_num"] = months
    df["quarter"] = df["month"].dt.quarter
    df["year"] = df["month"].dt.year
    df["time_index"] = np.arange(len(df))  # Índice temporal continuo (tendencia lineal)

    # Variables cíclicas de estacionalidad anual
    df["sin_month"] = np.sin(2 * np.pi * months / 12.0)
    df["cos_month"] = np.cos(2 * np.pi * months / 12.0)

    return df


def split_train_test_temporal(
    df: pd.DataFrame, 
    cutoff_date: str = "2024-01-01"
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Divide el dataset cronológicamente sin shuffle.
    - Train: Primeros 8 años (< cutoff_date)
    - Test:  Últimos 2 años  (>= cutoff_date)
    """
    df_sorted = df.sort_values("month").reset_index(drop=True)
    cutoff = pd.Timestamp(cutoff_date)

    train_df = df_sorted[df_sorted["month"] < cutoff].copy().reset_index(drop=True)
    test_df = df_sorted[df_sorted["month"] >= cutoff].copy().reset_index(drop=True)

    if len(train_df) == 0 or len(test_df) == 0:
        raise ValueError("El split generó un conjunto vacío. Verifica la fecha de corte.")

    # Aserción anti-fuga temporal
    assert train_df["month"].max() < test_df["month"].min(), "Error de Data Leakage: Las fechas de train y test se solapan."

    return train_df, test_df


def prepare_features(
    train_df: pd.DataFrame, 
    test_df: pd.DataFrame
) -> Dict[str, Any]:
    """
    Prepara y escala matrices de entrenamiento y prueba.
    El scaler se entrena SOLAMENTE con train_df para evitar Data Leakage.
    """
    feature_cols = [
        "month_num", 
        "quarter", 
        "year", 
        "time_index", 
        "sin_month", 
        "cos_month",
        "active_contracts", 
        "avg_contract_value_usd"
    ]
    target_col = "revenue_usd"

    X_train = train_df[feature_cols].copy()
    y_train = train_df[target_col].copy()

    X_test = test_df[feature_cols].copy()
    y_test = test_df[target_col].copy()

    # Ajuste exclusivo sobre entrenamiento
    scaler = StandardScaler()
    X_train_scaled = pd.DataFrame(
        scaler.fit_transform(X_train), 
        columns=feature_cols, 
        index=X_train.index
    )
    X_test_scaled = pd.DataFrame(
        scaler.transform(X_test), 
        columns=feature_cols, 
        index=X_test.index
    )

    return {
        "X_train": X_train_scaled,
        "y_train": y_train,
        "X_test": X_test_scaled,
        "y_test": y_test,
        "feature_cols": feature_cols,
        "scaler": scaler,
        "train_dates": train_df["month"],
        "test_dates": test_df["month"]
    }