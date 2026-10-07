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

Placeholder for a live Supabase sample (no service-role key in this run):

```json
{
  "period": { "from": "PENDING_LIVE_SAMPLE", "to": "PENDING_LIVE_SAMPLE" },
  "metrics": {
    "events_per_day": [],
    "error_rate_by_type": [],
    "latency_by_day": [],
    "auth_failure_rate": []
  }
}
```
