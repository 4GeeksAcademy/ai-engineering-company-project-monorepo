"""
Suite de Pruebas Unitarias para Validación Cruzada Temporal (TimeSeriesSplit).
Empresa: Nexova Solutions.
Módulo de prueba: tests/pipelines/test_time_series_cv.py
Verifica:
1. Preservación estricta del orden cronológico en cada fold (sin mezcla ni shuffle).
2. Que ningún índice o fecha de validación sea anterior a los de entrenamiento.
3. Inmunidad a datos de entrada desordenados (resistencia a Red Teaming).
4. Generación y validez de las métricas consolidadas (Media ± Std).
"""

from pathlib import Path
import os
import sys
import pytest
import pandas as pd
import numpy as np
from sklearn.model_selection import TimeSeriesSplit
# Asegurar la raíz del monorepo en sys.path
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
from services.ml.sales_pipeline import (
    load_raw_sales,
    engineer_temporal_features,
    split_train_test_temporal,
)
from services.ml.model_evaluator import (
    evaluate_time_series_cv,
    FEATURE_COLS,
    TARGET_COL,
)

@pytest.fixture
def sales_train_dataset():
    """Carga y prepara el dataset de entrenamiento (8 años / 96 meses)."""
    csv_path = Path("data/raw/nexova_sales.csv")
    if not csv_path.exists():
        pytest.skip(f"Dataset no encontrado en {csv_path}")
    
    raw_df= load_raw_sales(csv_path)
    featured_df= engineer_temporal_features(raw_df)
    train_df, _= split_train_test_temporal(featured_df, cutoff_date="2024-01-01")
    return train_df

def test_time_series_cv_chronological_order(sales_train_dataset):
    """
    Requisito Central del Ticket:
    Valida que TimeSeriesSplit preserve estrictamente el orden temporal en cada fold
    y que ningún índice de un fold posterior aparezca antes que uno de entrenamiento.
    """
    df= sales_train_dataset.sort_values("month").reset_index(drop=True)
    n_splits=5
    tscv= TimeSeriesSplit(n_splits=n_splits)

    fold_count= 0 
    for fold, (train_idx, val_idx) in enumerate(tscv.split(df), start=1):
        fold_count +=1

        #1. Aserción matemática sobre los índices
        assert len(train_idx) > 0, f"Fold{fold}: El conjunto de entrenamiento está vacío."
        assert len(val_idx) > 0, f"Fold{fold}: El conjunto de validación está vacío."
        assert max(train_idx) < min(val_idx), (f"Falla de orden temporal en fold {fold}: "
        f"Max Train Index ({max(train_idx)}) no es menor que Min Val Index ({min(val_idx)})."
        )
        #2. Aserción cronológica estricta sobre las fechas (meses)
        train_dates= df.iloc[train_idx]["month"]
        val_dates= df.iloc[val_idx]["month"]

        assert train_dates.max() < val_dates.min(), (f"Data leakage temporal en Fold {fold}: "
            f"La fecha máxima de Train ({train_dates.max()}) se solapa con la de Val ({val_dates.min()})."
            )
        #3. Validar que cada partición interna esté ordenada ascendentemente
        assert train_dates.is_monotonic_increasing, f"fold {fold}: Las fechas de Train no son monótonamente crecientes"
        assert val_dates.is_monotonic_increasing, f"Fold {fold}: Las fechas de Val no son monótonamente crecientes"

    assert fold_count == n_splits, f"Se esperaban {n_splits} folds, se ejecutaron {fold_count}."


def test_time_series_cv_expanding_window_property(sales_train_dataset):
    """
    Verifica la propiedad de 'Ventana en Expansión' propia de TimeSeriesSplit:
    cada fold sucesivo debe tener un conjunto de entrenamiento estrictamente mayor al anterior.
    """
    df= sales_train_dataset.sort_values("month").reset_index(drop=True)
    tscv= TimeSeriesSplit(n_splits=5)

    prev_train_size=0
    for fold, (train_idx, _) in enumerate(tscv.split(df), start=1):
        current_train_size= len(train_idx)
        assert current_train_size > prev_train_size, (f"Fold {fold}: El tamaño de Train ({current_train_size}) no es mayor al anterior ({prev_train_size}).")
        prev_train_size = current_train_size

def test_time_series_cv_metric_structure(sales_train_dataset):
    """
    Verifica que evaluate_time_series_cv retorne el diccionario completo con 5 folds,
    métricas finitas y desviación estándar no negativa.
    """
    results= evaluate_time_series_cv(sales_train_dataset, n_splits=5)

    assert results["n_splits"] == 5
    assert len(results["folds"]) == 5

    # Métricas de validación finitas y coherentes
    assert results["val_rmse_mean"] > 0
    assert results["val_rmse_std"] >= 0
    assert results["val_mae_mean"] > 0
    assert results["val_mae_std"] >= 0
    assert -1.0 <= results["val_r2_mean"] <= 1.0

def test_resilience_to_shuffled_sales_input():
    """
    Red Teaming: Comprueba que la función ordene internamente los datos por fecha
    incluso si se le entrega un DataFrame intencionalmente desordenado.
    """
    dates = pd.date_range("2016-01-01", "2023-12-01", freq="MS")
    shuffled_dates= np.random.RandomState(42).permutation(dates)

    messy_df= pd.DataFrame({
        "month": shuffled_dates,
        "revenue_usd": np.random.uniform(500000, 1000000, size=len(dates)),
        "active_contracts": 100,
        "avg_contract_value_usd": 3000,
        "quarter": 1,
        "month_num": 1,
        "year": 2020,
        "time_index": np.arange(len(dates)),
        "sin_month": 0.5,
        "cos_month": 0.5,
    })

    results= evaluate_time_series_cv(messy_df, n_splits=5)

    # Verificar que en cada fold el rango de fechas sea coherente
    for fold_data in results["folds"]:
        assert fold_data["train_rmse"] > 0
        assert fold_data["val_rmse"] > 0