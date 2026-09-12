"""Train and evaluate TrackFlow's chronological monthly revenue forecast.

The model uses only the consolidated rows defined by
``data/raw/CONTEXT-trackflow.es.md``.  Random Forest is intentional: Finance
can explain an ensemble of independently fitted decision trees more readily
than sequential boosting, while the dataset is small enough that the lower
 tuning cost is valuable.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy.stats import normaltest
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "raw" / "trackflow_sales.csv"
OUTPUT_DIR = ROOT / "output"
SEED = 42
REQUIRED_COLUMNS = {
    "month",
    "revenue_eur",
    "shipments_processed",
    "avg_revenue_per_shipment_eur",
    "market",
}
FEATURE_COLUMNS = ["year", "month_number", "shipments_processed", "avg_revenue_per_shipment_eur"]


def load_sales(path: Path = DATA_PATH) -> pd.DataFrame:
    """Load, validate, and clean the official TrackFlow sales CSV."""
    frame = pd.read_csv(path)
    missing = REQUIRED_COLUMNS.difference(frame.columns)
    if missing:
        raise ValueError(f"Missing required columns: {sorted(missing)}")

    frame = frame.loc[frame["market"].eq("consolidated")].copy()
    frame["month"] = pd.to_datetime(frame["month"], errors="coerce")
    numeric = ["revenue_eur", "shipments_processed", "avg_revenue_per_shipment_eur"]
    frame[numeric] = frame[numeric].apply(pd.to_numeric, errors="coerce")
    frame = frame.dropna(subset=["month", *numeric]).sort_values("month").reset_index(drop=True)
    if frame.empty:
        raise ValueError("The consolidated dataset is empty after cleaning")
    if (frame["revenue_eur"] <= 0).any():
        raise ValueError("revenue_eur must contain only positive values")
    return frame


def split_by_year(frame: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Hold out the two most recent years, preserving chronological order."""
    years = sorted(frame["month"].dt.year.unique())
    if len(years) != 10:
        raise ValueError(f"Expected 10 years, found {len(years)}: {years}")
    train_years, test_years = years[:8], years[8:]
    train = frame[frame["month"].dt.year.isin(train_years)].copy()
    test = frame[frame["month"].dt.year.isin(test_years)].copy()
    return train, test


def _features(frame: pd.DataFrame) -> pd.DataFrame:
    return pd.DataFrame(
        {
            "year": frame["month"].dt.year,
            "month_number": frame["month"].dt.month,
            "shipments_processed": frame["shipments_processed"],
            "avg_revenue_per_shipment_eur": frame["avg_revenue_per_shipment_eur"],
        },
        index=frame.index,
    )


def population_stability_index(train: pd.Series, test: pd.Series, bins: int = 10) -> float:
    """Compare train/test distributions using equal-width train bins."""
    edges = np.unique(np.quantile(train, np.linspace(0, 1, bins + 1)))
    if len(edges) < 2:
        return 0.0
    train_counts, _ = np.histogram(train, bins=edges)
    test_counts, _ = np.histogram(test, bins=edges)
    train_dist = np.clip(train_counts / len(train), 1e-6, None)
    test_dist = np.clip(test_counts / len(test), 1e-6, None)
    return float(np.sum((test_dist - train_dist) * np.log(test_dist / train_dist)))


def gini_score(actual: np.ndarray, predicted: np.ndarray) -> float:
    """Normalized Gini ranking score, where 1 is perfect ordering."""
    order = np.argsort(-predicted)
    actual = actual[order]
    cumulative = np.cumsum(actual)
    denominator = actual.sum()
    if denominator == 0:
        return 0.0
    lorentz = cumulative.sum() / (len(actual) * denominator) - (len(actual) + 1) / (2 * len(actual))
    perfect = np.cumsum(np.sort(actual)[::-1]).sum() / (len(actual) * denominator) - (len(actual) + 1) / (2 * len(actual))
    return float(lorentz / perfect) if perfect else 0.0


def train_and_evaluate() -> dict[str, float]:
    frame = load_sales()
    train, test = split_by_year(frame)

    # Fit the scaler only on the first eight years to prevent test leakage.
    scaler = StandardScaler().fit(_features(train))
    x_train = scaler.transform(_features(train))
    x_test = scaler.transform(_features(test))
    y_train, y_test = train["revenue_eur"].to_numpy(), test["revenue_eur"].to_numpy()

    model = RandomForestRegressor(n_estimators=300, random_state=SEED, min_samples_leaf=2)
    model.fit(x_train, y_train)
    tree_predictions = np.stack([tree.predict(x_test) for tree in model.estimators_])
    prediction = tree_predictions.mean(axis=0)
    variability = tree_predictions.std(axis=0)
    residuals = y_test - prediction

    mse = float(mean_squared_error(y_test, prediction))
    k2, _ = normaltest(residuals)
    metrics = {
        "mse_eur_squared": mse,
        "mse_percent_of_test_mean_revenue": float(mse / np.mean(y_test) ** 2 * 100),
        "psi": population_stability_index(train["revenue_eur"], test["revenue_eur"]),
        "gini": gini_score(y_test, prediction),
        "k2_score": float(k2),
    }

    OUTPUT_DIR.mkdir(exist_ok=True)
    dates = test["month"]
    plt.figure(figsize=(12, 6))
    plt.plot(dates, y_test, marker="o", label="Actual revenue")
    plt.plot(dates, prediction, marker="o", label="Random Forest prediction")
    plt.fill_between(dates, prediction - variability, prediction + variability, alpha=0.25, label="Tree variability")
    plt.title("TrackFlow revenue forecast — 2024–2025 test period")
    plt.ylabel("Revenue (EUR)")
    plt.xlabel("Month")
    plt.legend()
    plt.grid(alpha=0.25)
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "forecast_vs_actual.png", dpi=150)
    plt.close()

    report = [
        "# TrackFlow sales forecast metrics",
        "",
        "Evaluation uses only the two held-out years (2024–2025).",
        "",
        "| Metric | Value | Interpretation |",
        "|---|---:|---|",
        f"| MSE (EUR²) | {mse:,.2f} | Squared monthly forecast error. |",
        f"| MSE (% of mean²) | {metrics['mse_percent_of_test_mean_revenue']:.2f}% | Scale-aware error for Finance. |",
        f"| PSI | {metrics['psi']:.4f} | Train/test revenue distribution shift. |",
        f"| Gini | {metrics['gini']:.4f} | Ranking quality for high- versus low-revenue months. |",
        f"| K² Score | {metrics['k2_score']:.4f} | D’Agostino K² residual normality statistic; lower is less evidence of non-normality. |",
        "",
        "Random Forest was selected because its independently fitted trees are easier to explain to Finance than sequential boosting, and it requires less tuning for this 120-row dataset.",
        "Missing numeric values were removed because the official dataset is complete and imputing revenue or shipment counts would invent business observations.",
        "The scaler was fitted exclusively on the first eight years; the last two years were never used during fitting.",
    ]
    (OUTPUT_DIR / "metrics.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.parse_args()
    metrics = train_and_evaluate()
    for name, value in metrics.items():
        print(f"{name}: {value:.6f}")


if __name__ == "__main__":
    main()
