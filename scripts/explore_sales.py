"""
Script de Exploración y Auditoría del Dataset de Ventas de Nexova Solutions.
Verifica:
1. Esquema y tipos de datos.
2. Ausencia de valores nulos.
3. Rango de fechas (10 años = 8 train + 2 test).
4. Patrón de estacionalidad (picos en Q1 y caída en Agosto por vacaciones).
"""

from pathlib import Path
import sys
import pandas as pd

# Aseguramos compatibilidad de codificación UTF-8 en consolas Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

DATA_PATH = Path("data/raw/nexova_sales.csv")

def explore():
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"No se encontro el archivo en {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)
    print(f"[OK] Registros totales: {len(df)}")
    print(f"[OK] Columnas: {list(df.columns)}\n")

    # 1. Parseo de fechas
    df["month"] = pd.to_datetime(df["month"])
    df = df.sort_values("month").reset_index(drop=True)

    start_date = df["month"].min()
    end_date = df["month"].max()
    print(f"[*] Rango temporal: {start_date.strftime('%Y-%m-%d')} a {end_date.strftime('%Y-%m-%d')}")

    # 2. Valores nulos
    null_counts = df.isnull().sum()
    print("\n[*] Valores nulos por columna:")
    print(null_counts)

    # 3. Verificacion de corte temporal (8 anos / 2 anos)
    cutoff_date = pd.Timestamp("2024-01-01")
    train_df = df[df["month"] < cutoff_date]
    test_df = df[df["month"] >= cutoff_date]

    print("\n[+] Division temporal requerida:")
    print(f"   Train (primeros 8 anos): {len(train_df)} meses ({train_df['month'].min().strftime('%Y-%m')} a {train_df['month'].max().strftime('%Y-%m')})")
    print(f"   Test  (ultimos 2 anos):  {len(test_df)} meses ({test_df['month'].min().strftime('%Y-%m')} a {test_df['month'].max().strftime('%Y-%m')})")

    # 4. Analisis de estacionalidad mensual media
    df["month_num"] = df["month"].dt.month
    monthly_avg = df.groupby("month_num")["revenue_usd"].mean()

    print("\n[+] Ingresos promedio por mes del ano (Deteccion de Estacionalidad):")
    for m, rev in monthly_avg.items():
        bar = "#" * int(rev / 40000)
        print(f"   Mes {m:02d}: ${rev:,.2f} | {bar}")

if __name__ == "__main__":
    explore()