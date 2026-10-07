import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AsyncPanel } from "../components/AsyncState";
import {
  fetchTelemetryReport,
  toUserFacingMessage,
  type AuthFailureRow,
  type ErrorRateRow,
  type EventsPerDayRow,
  type LatencyByDayRow,
  type TelemetryReport,
} from "../lib/api";
import "./TelemetryReportPage.css";

type AppliedWindow = { from: string; to: string } | null;

function percent(value: number): string {
  const ratio = Number.isFinite(value) ? value : 0;
  return `${(ratio * 100).toFixed(1)}%`;
}

function ms(value: number): string {
  const amount = Number.isFinite(value) ? value : 0;
  return `${amount.toFixed(1)} ms`;
}

function Bar({
  label,
  width,
  value,
}: {
  label: string;
  width: number;
  value: string;
}) {
  const clamped = Math.max(0, Math.min(100, width));
  return (
    <div className="tel-bar">
      <span className="tel-bar__label">{label}</span>
      <span className="tel-bar__track" aria-hidden="true">
        <span className="tel-bar__fill" style={{ width: `${clamped}%` }} />
      </span>
      <span className="tel-bar__value">{value}</span>
    </div>
  );
}

function EventsChart({ rows }: { rows: EventsPerDayRow[] }) {
  const max = Math.max(1, ...rows.map((row) => row.events));
  return (
    <div className="tel-bars">
      {rows.map((row) => (
        <Bar
          key={`${row.date}-${row.event_type}`}
          label={`${row.date} · ${row.event_type}`}
          width={(row.events / max) * 100}
          value={String(row.events)}
        />
      ))}
    </div>
  );
}

function ErrorChart({ rows }: { rows: ErrorRateRow[] }) {
  return (
    <div className="tel-bars">
      {rows.map((row) => (
        <Bar
          key={`${row.date}-${row.event_type}`}
          label={`${row.date} · ${row.event_type}`}
          width={row.error_rate * 100}
          value={`${percent(row.error_rate)} (${row.failures}/${row.events})`}
        />
      ))}
    </div>
  );
}

function LatencyChart({ rows }: { rows: LatencyByDayRow[] }) {
  const max = Math.max(1, ...rows.map((row) => row.p95_ms));
  return (
    <div className="tel-bars">
      {rows.map((row) => (
        <Bar
          key={`${row.date}-${row.endpoint}`}
          label={`${row.date} · ${row.endpoint}`}
          width={(row.p95_ms / max) * 100}
          value={`p95 ${ms(row.p95_ms)} · mean ${ms(row.mean_ms)}`}
        />
      ))}
    </div>
  );
}

function AuthChart({ rows }: { rows: AuthFailureRow[] }) {
  return (
    <div className="tel-bars">
      {rows.map((row) => (
        <Bar
          key={row.date}
          label={row.date}
          width={row.auth_failure_rate * 100}
          value={`${percent(row.auth_failure_rate)} (${row.failed}/${row.attempts})`}
        />
      ))}
    </div>
  );
}

export function TelemetryReportPage() {
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [applied, setApplied] = useState<AppliedWindow>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [report, setReport] = useState<TelemetryReport | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const retry = useCallback(() => {
    setNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let outcome: "success" | "error" = "error";
    setStatus("loading");
    setError(null);

    void (async () => {
      try {
        const payload = await fetchTelemetryReport(applied?.from, applied?.to);
        if (cancelled) {
          return;
        }
        setReport(payload);
        outcome = "success";
      } catch (err: unknown) {
        if (!cancelled) {
          setReport(null);
          setError(
            toUserFacingMessage(
              err,
              "The technical telemetry report could not be loaded. Try again in a moment.",
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setStatus(outcome);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applied, nonce]);

  function applyWindow(event: FormEvent) {
    event.preventDefault();
    const from = draftFrom.trim();
    const to = draftTo.trim();
    if (!from && !to) {
      setFormError(null);
      setApplied(null);
      return;
    }
    if (!from || !to) {
      setFormError("Choose both a start and an end, or clear both to use the last 7 days.");
      return;
    }
    if (to <= from) {
      setFormError("End must be after start. End is exclusive.");
      return;
    }
    setFormError(null);
    setApplied({ from: `${from}T00:00:00Z`, to: `${to}T00:00:00Z` });
  }

  function resetWindow() {
    setDraftFrom("");
    setDraftTo("");
    setFormError(null);
    setApplied(null);
  }

  const metrics = report?.metrics;
  const events = metrics?.events_per_day ?? [];
  const errors = metrics?.error_rate_by_type ?? [];
  const latency = metrics?.latency_by_day ?? [];
  const auth = metrics?.auth_failure_rate ?? [];

  return (
    <section className="tel" aria-labelledby="tel-title">
      <div className="tel__welcome">
        <p className="tel__kicker">Technology · engineering health</p>
        <h2 id="tel-title">Technical telemetry</h2>
        <p className="tel__lead">
          Event volume, warn/error share, API latency, and staff sign-in failures.
          This view is for the engineering team. It is not the Monday sales report.
        </p>
      </div>

      <form className="tel__form" onSubmit={applyWindow}>
        <label>
          From (inclusive, UTC)
          <input
            type="date"
            value={draftFrom}
            onChange={(event) => setDraftFrom(event.target.value)}
          />
        </label>
        <label>
          To (exclusive, UTC)
          <input
            type="date"
            value={draftTo}
            onChange={(event) => setDraftTo(event.target.value)}
          />
        </label>
        <div className="tel__form-actions">
          <button type="submit">Apply window</button>
          <button type="button" className="tel__secondary" onClick={resetWindow}>
            Last 7 days
          </button>
        </div>
        {formError ? (
          <p className="tel__form-error" role="alert">
            {formError}
          </p>
        ) : null}
      </form>

      <AsyncPanel
        status={status}
        loadingLabel="Loading the technical report…"
        error={error}
        onRetry={retry}
        skeletonRows={6}
      >
        <div className="tel__dashboard" aria-label="Technical telemetry report">
          <article className="tel__panel tel__panel--span">
            <h3>Period</h3>
            <dl className="tel__stats">
              <div>
                <dt>From</dt>
                <dd>{report?.period.from ?? "—"}</dd>
              </div>
              <div>
                <dt>To</dt>
                <dd>{report?.period.to ?? "—"}</dd>
              </div>
            </dl>
            <p className="tel__note">
              The API window is inclusive of From and exclusive of To. A repeat
              request for the same window is served from a 60-second cache.
            </p>
          </article>

          <article className="tel__panel">
            <h3>Events per day</h3>
            <p className="tel__question">Which technical events fired, and how often?</p>
            {events.length === 0 ? (
              <p className="tel__empty">No technical events in this window.</p>
            ) : (
              <EventsChart rows={events} />
            )}
          </article>

          <article className="tel__panel">
            <h3>Error rate by type</h3>
            <p className="tel__question">What share of each event type was warn or error?</p>
            {errors.length === 0 ? (
              <p className="tel__empty">No technical events in this window.</p>
            ) : (
              <ErrorChart rows={errors} />
            )}
          </article>

          <article className="tel__panel tel__panel--span">
            <h3>Latency by day</h3>
            <p className="tel__question">How slow is each API route (mean and p95 of duration_ms)?</p>
            {latency.length === 0 ? (
              <p className="tel__empty">No api_latency_recorded rows with a route in this window.</p>
            ) : (
              <>
                <LatencyChart rows={latency} />
                <div className="tel__table-wrap">
                  <table className="tel__table">
                    <caption>Mean and p95 latency by UTC day and route</caption>
                    <thead>
                      <tr>
                        <th scope="col">Day</th>
                        <th scope="col">Route</th>
                        <th scope="col">Mean</th>
                        <th scope="col">p95</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latency.map((row) => (
                        <tr key={`${row.date}-${row.endpoint}`}>
                          <td>{row.date}</td>
                          <td>{row.endpoint}</td>
                          <td>{ms(row.mean_ms)}</td>
                          <td>{ms(row.p95_ms)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </article>

          <article className="tel__panel tel__panel--span">
            <h3>Auth failure rate</h3>
            <p className="tel__question">
              What fraction of staff sign-in attempts failed each day?
            </p>
            {auth.length === 0 ? (
              <p className="tel__empty">No login attempts in this window.</p>
            ) : (
              <>
                <AuthChart rows={auth} />
                <div className="tel__table-wrap">
                  <table className="tel__table">
                    <caption>Daily login failure rate</caption>
                    <thead>
                      <tr>
                        <th scope="col">Day</th>
                        <th scope="col">Failed</th>
                        <th scope="col">Succeeded</th>
                        <th scope="col">Attempts</th>
                        <th scope="col">Failure rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auth.map((row) => (
                        <tr key={row.date}>
                          <td>{row.date}</td>
                          <td>{row.failed}</td>
                          <td>{row.succeeded}</td>
                          <td>{row.attempts}</td>
                          <td>{percent(row.auth_failure_rate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </article>
        </div>
      </AsyncPanel>
    </section>
  );
}
