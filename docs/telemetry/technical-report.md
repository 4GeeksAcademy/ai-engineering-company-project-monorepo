# Technical telemetry report

Department served: **Technology** (Nicolás Park). This is an engineering health report over `public.telemetry_events`. It is not Mariana Restrepo’s Monday sales report and it does not compute revenue, conversion, or purchasing cost.

`GET /telemetry/report` resolves one UTC window and passes it to every metric. Omit `start_date` and `end_date` for the last 7 days (end rounded down to the current UTC minute). Provide both as ISO 8601 to choose another window (`end` is exclusive). A bad date is HTTP 422. A missing `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is HTTP 503. Staff calls send the same Bearer JWT as the other internal routes.

The result is cached in memory for 60 seconds, keyed by the resolved `(from, to)` pair. The default window is remembered for those same 60 seconds, so a second request with no dates reuses the cache instead of opening a new minute.

## Pipeline order

Each function in `services/telemetry/analysis.py` does this, and only this:

1. **Load (SQL).** `load_telemetry_events` calls PostgREST. `event_type=in.(...)`, `timestamp=gte.`, and `timestamp=lt.` become a SQL `WHERE` on the database (inclusive start, exclusive end, UTC). The function never reads the whole table and never re-filters those columns in Python.
2. **Refine (Pandas).** Extract tag fields (the latency route is `tags.route_template`) and drop rows whose dimension is null.
3. **Convert.** `pd.to_datetime(..., utc=True)` before any `groupby`, then `dt.date`.
4. **Group** with `groupby` on the day and the operational dimension.
5. **Aggregate** with Pandas (`size`, `count`, `sum`, `mean`, `quantile`). No Python loop computes a metric.
6. **Serve** with `.reset_index().to_dict(orient="records")`. Dates are `YYYY-MM-DD` strings. Counts are ints. Rates are finite floats.

Tests inject a DataFrame through `loader=` so the Pandas steps do not need Supabase.

## Metrics

| Function | Response key | Operational question |
| --- | --- | --- |
| `events_per_day` | `metrics.events_per_day` | Which technical events fired, and how often, on each UTC day? Grouped by `date` and `event_type`. |
| `error_rate_by_type` | `metrics.error_rate_by_type` | What share of each technical event type was `level` `warn` or `error`, per UTC day? Failures over all rows of that type that day. |
| `latency_by_day` | `metrics.latency_by_day` | How slow is each API route? Mean and p95 of `api_latency_recorded.value` (`duration_ms`) by UTC day and `tags.route_template`. |
| `auth_failure_rate` | `metrics.auth_failure_rate` | What fraction of staff sign-in attempts failed each UTC day? `user_login_failed / (user_login_failed + user_login_succeeded)`, both types loaded with `event_type IN (...)`. |

Volume and error rate use the technical catalogue only: `api_latency_recorded`, `client_exception_caught`, `direct_stock_edit_rejected`, `flow_step_recorded`, `section_viewed`, `user_login_failed`, `user_login_succeeded`. `sale_completed` and other business facts are not inputs.

The staff page is `uis/backoffice` route `/telemetry`. It shows `period.from` and `period.to`, accepts a date window, and draws one bar chart (plus a table for latency and sign-in) per metric.

## Response shape

```json
{
  "period": { "from": "<ISO-8601 UTC>", "to": "<ISO-8601 UTC>" },
  "metrics": {
    "events_per_day": [],
    "error_rate_by_type": [],
    "latency_by_day": [],
    "auth_failure_rate": []
  }
}
```

Live sample from project `tlfllnfwynaykxglsqhc`, table `public.telemetry_events` (explicit window `2026-09-22T00:00:00Z` → `2026-10-07T00:00:00Z`, exclusive end). This window includes the Sept 22 mixed-batch rows and the Oct 6 browser session.

```json
{
  "period": {
    "from": "2026-09-22T00:00:00Z",
    "to": "2026-10-07T00:00:00Z"
  },
  "metrics": {
    "events_per_day": [
      {
        "date": "2026-09-22",
        "event_type": "api_latency_recorded",
        "events": 1
      },
      {
        "date": "2026-09-22",
        "event_type": "client_exception_caught",
        "events": 1
      },
      {
        "date": "2026-10-06",
        "event_type": "api_latency_recorded",
        "events": 19
      },
      {
        "date": "2026-10-06",
        "event_type": "direct_stock_edit_rejected",
        "events": 1
      },
      {
        "date": "2026-10-06",
        "event_type": "flow_step_recorded",
        "events": 23
      },
      {
        "date": "2026-10-06",
        "event_type": "section_viewed",
        "events": 7
      },
      {
        "date": "2026-10-06",
        "event_type": "user_login_failed",
        "events": 1
      },
      {
        "date": "2026-10-06",
        "event_type": "user_login_succeeded",
        "events": 1
      }
    ],
    "error_rate_by_type": [
      {
        "date": "2026-09-22",
        "event_type": "api_latency_recorded",
        "events": 1,
        "failures": 0,
        "error_rate": 0.0
      },
      {
        "date": "2026-09-22",
        "event_type": "client_exception_caught",
        "events": 1,
        "failures": 1,
        "error_rate": 1.0
      },
      {
        "date": "2026-10-06",
        "event_type": "api_latency_recorded",
        "events": 19,
        "failures": 3,
        "error_rate": 0.157895
      },
      {
        "date": "2026-10-06",
        "event_type": "direct_stock_edit_rejected",
        "events": 1,
        "failures": 1,
        "error_rate": 1.0
      },
      {
        "date": "2026-10-06",
        "event_type": "flow_step_recorded",
        "events": 23,
        "failures": 0,
        "error_rate": 0.0
      },
      {
        "date": "2026-10-06",
        "event_type": "section_viewed",
        "events": 7,
        "failures": 0,
        "error_rate": 0.0
      },
      {
        "date": "2026-10-06",
        "event_type": "user_login_failed",
        "events": 1,
        "failures": 1,
        "error_rate": 1.0
      },
      {
        "date": "2026-10-06",
        "event_type": "user_login_succeeded",
        "events": 1,
        "failures": 0,
        "error_rate": 0.0
      }
    ],
    "latency_by_day": [
      {
        "date": "2026-09-22",
        "endpoint": "/inventory",
        "mean_ms": 180.0,
        "p95_ms": 180.0
      },
      {
        "date": "2026-10-06",
        "endpoint": "/auth/login",
        "mean_ms": 292.0,
        "p95_ms": 300.1
      },
      {
        "date": "2026-10-06",
        "endpoint": "/auth/me",
        "mean_ms": 41.0,
        "p95_ms": 41.0
      },
      {
        "date": "2026-10-06",
        "endpoint": "/customers",
        "mean_ms": 397.0,
        "p95_ms": 397.0
      },
      {
        "date": "2026-10-06",
        "endpoint": "/inventory",
        "mean_ms": 34.0,
        "p95_ms": 34.0
      },
      {
        "date": "2026-10-06",
        "endpoint": "/inventory/{product_id}",
        "mean_ms": 12.5,
        "p95_ms": 12.95
      },
      {
        "date": "2026-10-06",
        "endpoint": "/locations/overview",
        "mean_ms": 37.0,
        "p95_ms": 37.0
      },
      {
        "date": "2026-10-06",
        "endpoint": "/menus",
        "mean_ms": 397.0,
        "p95_ms": 397.0
      },
      {
        "date": "2026-10-06",
        "endpoint": "/orders/inbound",
        "mean_ms": 13.5,
        "p95_ms": 13.95
      },
      {
        "date": "2026-10-06",
        "endpoint": "/people/employees",
        "mean_ms": 399.0,
        "p95_ms": 399.0
      },
      {
        "date": "2026-10-06",
        "endpoint": "/people/vacancies",
        "mean_ms": 398.0,
        "p95_ms": 398.0
      },
      {
        "date": "2026-10-06",
        "endpoint": "/realtime/ops-alerts",
        "mean_ms": 38.0,
        "p95_ms": 38.0
      },
      {
        "date": "2026-10-06",
        "endpoint": "/reporting/pipeline-runs/latest",
        "mean_ms": 13.0,
        "p95_ms": 13.0
      },
      {
        "date": "2026-10-06",
        "endpoint": "/reporting/weekly-location-performance",
        "mean_ms": 13.0,
        "p95_ms": 13.0
      },
      {
        "date": "2026-10-06",
        "endpoint": "/sales",
        "mean_ms": 13.0,
        "p95_ms": 13.0
      },
      {
        "date": "2026-10-06",
        "endpoint": "/suppliers",
        "mean_ms": 397.0,
        "p95_ms": 397.0
      },
      {
        "date": "2026-10-06",
        "endpoint": "/training/recipes",
        "mean_ms": 399.0,
        "p95_ms": 399.0
      }
    ],
    "auth_failure_rate": [
      {
        "date": "2026-10-06",
        "failed": 1,
        "succeeded": 1,
        "attempts": 2,
        "auth_failure_rate": 0.5
      }
    ]
  }
}
```
