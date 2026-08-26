from __future__ import annotations
import csv
from pathlib import Path
from constants import REQUIRED_COLUMNS

def load_csv_native(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames: raise ValueError("CSV file is missing a header row")
        missing = [c for c in REQUIRED_COLUMNS if c not in reader.fieldnames]
        if missing: raise ValueError(f"CSV is missing required columns: {', '.join(missing)}")
        return [{k: (v or "") for k, v in row.items()} for row in reader]

def load_csv_pandas(path: Path) -> list[dict[str, str]]:
    import pandas as pd
    frame = pd.read_csv(path, dtype=str, keep_default_na=False)
    missing = [c for c in REQUIRED_COLUMNS if c not in frame.columns]
    if missing: raise ValueError(f"CSV is missing required columns: {', '.join(missing)}")
    return [{k: str(row.get(k, "") or "") for k in REQUIRED_COLUMNS} for row in frame.to_dict(orient="records")]

def load_csv(path: Path, engine: str = "native") -> list[dict[str, str]]:
    if engine == "pandas": return load_csv_pandas(path)
    if engine == "native": return load_csv_native(path)
    raise ValueError(f"Unsupported engine: {engine}")
