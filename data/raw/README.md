# `data/raw` folder

This folder is intended for **raw data** related to the company: dumps, exports, sample files, event samples, or untransformed datasets.

- **Main purpose**: serve as a landing zone or reference for original data before pipelines process it.
- **Recommendation**: document each dataset’s origin, format, expected size, privacy/PII considerations, and how it is versioned (ideally avoiding sensitive data in the repository).

## Contents

- `telemetry_YYYY-MM-DD.csv` — daily backup of `telemetry_events` written by `scripts/nightly_export.py` (milestone 21): one row per event whose `timestamp` falls on that UTC day. It is for audit and recovery; the pipeline reads from the database, not from here. It contains `user_id` and `session_id`, so it is **not versioned** (`.gitignore`). Written once per day, never overwritten.

> _Spanish version: [README.es.md](./README.es.md)._
