"""
Tests Unitarios para la Validación de División Temporal y Anti-Leakage.
Empresa: Nexova Solutions.
Verifica:
1. Regla exacta de los 8 años de entrenamiento y 2 años de comprobación.
2. Ausencia total de solapamiento de fechas entre Train y Test.
3. Inmunidad a datos desordenados (resistencia a Red Teaming).
4. El ajuste de preprocesamiento (StandardScaler) se realiza únicamente sobre Train.
"""

from pathlib import Path
import pytest
import pandas as pd
import numpy as np
import os
import sys

# Asegurar la raíz del monorepo en sys.path para pytest
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)


from services.ml.sales_pipeline import (
    load_raw_sales,
    split_train_test_temporal,
    engineer_temporal_features,
    prepare_features,
)

@pytest.fixture
def sample_sales_data():
    """Carga los datos reales de ventas de Nexova."""
    csv_path = Path("data/raw/nexova_sales.csv")
    if not csv_path.exists():
        pytest.skip(f"Dataset no encontrado en {csv_path}")
    return load_raw_sales(csv_path)


def test_split_temporal_proportions(sample_sales_data):
    """Valida la regla de los 8 años (96 meses) y 2 años (24 meses)."""
    df = engineer_temporal_features(sample_sales_data)
    train_df, test_df = split_train_test_temporal(df, cutoff_date="2024-01-01")

    # 12 meses x 8 años = 96
    assert len(train_df) == 96, f"Se esperaban 96 meses en Train, se obtuvieron {len(train_df)}"

    # 12 meses x 2 años = 24
    assert len(test_df) == 24, f"Se esperaban 24 meses en Test, se obtuvieron {len(test_df)}"

    # Total suma 120 meses
    assert len(train_df) + len(test_df) == 120


def test_no_temporal_data_leakage(sample_sales_data):
    """Verifica que la fecha máxima de Train sea estrictamente menor a la mínima de Test."""
    df = engineer_temporal_features(sample_sales_data)
    train_df, test_df = split_train_test_temporal(df, cutoff_date="2024-01-01")

    max_train_date = train_df["month"].max()
    min_test_date = test_df["month"].min()

    assert max_train_date < min_test_date, (
        f"Fuga temporal detectada: Max Train ({max_train_date}) no es menor que Min Test ({min_test_date})"
    )
    assert max_train_date == pd.Timestamp("2023-12-01")
    assert min_test_date == pd.Timestamp("2024-01-01")


def test_resilience_to_unsorted_records():
    """Red Teaming: Comprueba que el split ordene cronológicamente antes de dividir."""
    # Creamos un conjunto desordenado artificialmente
    dates = pd.date_range("2020-01-01", "2024-12-01", freq="MS")
    shuffled_dates = np.random.RandomState(42).permutation(dates)

    messy_df = pd.DataFrame({
        "month": shuffled_dates,
        "revenue_usd": np.random.uniform(500000, 1000000, size=len(dates)),
        "active_contracts": 100,
        "avg_contract_value_usd": 3000
    })

    train_df, test_df = split_train_test_temporal(messy_df, cutoff_date="2024-01-01")

    assert train_df["month"].max() < test_df["month"].min()
    assert test_df["month"].min() >= pd.Timestamp("2024-01-01")


def test_scaler_fitted_only_on_train(sample_sales_data):
    """Verifica que la media del scaler coincida exactamente con la media de Train."""
    df = engineer_temporal_features(sample_sales_data)
    train_df, test_df = split_train_test_temporal(df, cutoff_date="2024-01-01")
    data = prepare_features(train_df, test_df)

    scaler = data["scaler"]
    feature_cols = data["feature_cols"]

    # Comparamos la media del scaler con la media directa de train_df
    for i, col in enumerate(feature_cols):
        np.testing.assert_almost_equal(
            scaler.mean_[i],
            train_df[col].mean(),
            decimal=4,
            err_msg=f"El scaler contiene medias contaminadas que no coinciden con Train para {col}"
        )