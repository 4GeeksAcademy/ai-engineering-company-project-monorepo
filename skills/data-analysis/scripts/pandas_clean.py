"""
Safe snippet for basic pandas cleaning. Copy and adapt for your dataset.
Run: python pandas_clean.py  (ensure pandas is installed)
"""

from __future__ import annotations

import sys

try:
	import pandas as pd
except ModuleNotFoundError:
	if __name__ == "__main__":
		print("Error: pandas is required to run this cleaning example.", file=sys.stderr)
		raise SystemExit(2)
	raise


def main() -> int:
	try:
		# Load (adjust path and kwargs as needed)
		df = pd.read_csv("data.csv")  # or read_json, read_excel
	except FileNotFoundError:
		print("Error: data.csv was not found in the current directory.", file=sys.stderr)
		return 2
	except PermissionError:
		print("Error: data.csv cannot be read due to insufficient permissions.", file=sys.stderr)
		return 2
	except pd.errors.EmptyDataError:
		print("Error: data.csv is empty or has no header row.", file=sys.stderr)
		return 2
	except pd.errors.ParserError:
		print("Error: data.csv is malformed and could not be parsed.", file=sys.stderr)
		return 2
	except UnicodeDecodeError:
		print("Error: data.csv must be valid UTF-8 text.", file=sys.stderr)
		return 2
	except OSError:
		print("Error: data.csv could not be read.", file=sys.stderr)
		return 2

	print("df_shape", df.shape)
	print("df_dtypes", df.dtypes)

	# Drop fully null columns
	df = df.dropna(axis=1, how="all")
	print("df_shape_after_drop_all_null_cols", df.shape)

	# Fill or drop nulls in key columns (customise columns)
	# df = df.dropna(subset=["required_col"])
	# df["optional_col"] = df["optional_col"].fillna(0)

	# Normalise column names (optional)
	df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")
	print("df_columns", list(df.columns))

	# Deduplicate (optional)
	before = len(df)
	df = df.drop_duplicates()
	print("rows_dropped_duplicates", before - len(df))

	# Sample output
	print("df_head", df.head())
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
