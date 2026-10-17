# TrackFlow sales forecast metrics

Evaluation uses only the two held-out years (2024–2025).

| Metric | Value | Interpretation |
|---|---:|---|
| MSE (EUR²) | 12,232,916,021.92 | Squared monthly forecast error. |
| MSE (% of mean²) | 0.72% | Scale-aware error for Finance. |
| PSI | 8.8900 | Train/test revenue distribution shift. |
| Gini | 0.9148 | Ranking quality for high- versus low-revenue months. |
| K² Score | 8.6360 | D’Agostino K² residual normality statistic; lower is less evidence of non-normality. |

Random Forest was selected because its independently fitted trees are easier to explain to Finance than sequential boosting, and it requires less tuning for this 120-row dataset.
Missing numeric values were removed because the official dataset is complete and imputing revenue or shipment counts would invent business observations.
The scaler was fitted exclusively on the first eight years; the last two years were never used during fitting.
