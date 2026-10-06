import { useCallback, useEffect, useMemo, useState } from "react";
import { AsyncPanel } from "../components/AsyncState";
import {
  fetchLatestPipelineRun,
  fetchWeeklyLocationPerformance,
  toUserFacingMessage,
  type PipelineRunLatest,
  type WeeklyLocationPerformanceRow,
} from "../lib/api";
import "./WeeklyPerformancePage.css";

const LOCATION_LABELS: Record<string, string> = {
  "co-med-centro": "Medellín Centro",
  "co-med-elpoblado": "Medellín El Poblado",
  "co-bog-chapinero": "Bogotá Chapinero",
  "co-bog-norte": "Bogotá Norte",
  "co-cali-norte": "Cali Norte",
  "co-barranquilla": "Barranquilla",
  "co-cartagena": "Cartagena",
  "co-pereira": "Pereira",
  "us-mia-brickell": "Miami Brickell",
  "us-mia-downtown": "Miami Downtown",
  "us-orlando": "Orlando",
  "us-tampa": "Tampa",
  "us-ftlauderdale": "Fort Lauderdale",
  "us-jacksonville": "Jacksonville",
};

function formatMoney(value: number, currency: string): string {
  const amount = Number.isFinite(value) ? value : 0;
  if (currency === "COP") {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(amount);
  }
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  return String(amount);
}

function formatRatio(value: number): string {
  const ratio = Number.isFinite(value) ? value : 0;
  return `${(ratio * 100).toFixed(2)}%`;
}

function locationLabel(locationId: string): string {
  return LOCATION_LABELS[locationId] ?? locationId;
}

/** Chain week is [Monday, next Monday) in America/Bogota. */
function chainWeekWindowLabel(weekStart: string | null): string {
  if (!weekStart) {
    return "—";
  }
  const start = new Date(`${weekStart}T00:00:00`);
  if (Number.isNaN(start.getTime())) {
    return weekStart;
  }
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const endIso = end.toISOString().slice(0, 10);
  return `Chain week starting Monday ${weekStart} through Sunday before ${endIso} (America/Bogota)`;
}

function refreshStatusLabel(runMeta: PipelineRunLatest | null): string | null {
  if (!runMeta?.status) {
    return null;
  }
  const statusWord =
    runMeta.status === "Success"
      ? "ready"
      : runMeta.status === "Failed"
        ? "failed"
        : runMeta.status === "Running"
          ? "in progress"
          : runMeta.status.toLowerCase();
  const parts = [`Last Monday report refresh: ${statusWord}`];
  if (runMeta.window_start) {
    parts.push(`for the week starting ${runMeta.window_start}`);
  }
  return parts.join(" ");
}

export function WeeklyPerformancePage() {
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [rows, setRows] = useState<WeeklyLocationPerformanceRow[]>([]);
  const [runMeta, setRunMeta] = useState<PipelineRunLatest | null>(null);
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
        const [kpiPayload, latestRun] = await Promise.all([
          fetchWeeklyLocationPerformance(),
          fetchLatestPipelineRun().catch(() => null),
        ]);
        if (cancelled) {
          return;
        }
        setWeekStart(kpiPayload?.week_start ?? null);
        setRows(Array.isArray(kpiPayload?.locations) ? kpiPayload.locations : []);
        setRunMeta(latestRun);
        outcome = "success";
      } catch (err: unknown) {
        if (!cancelled) {
          setRows([]);
          setWeekStart(null);
          setRunMeta(null);
          setError(
            toUserFacingMessage(
              err,
              "The Monday weekly report could not be loaded. Try again in a moment.",
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
  }, [nonce]);

  const colombia = useMemo(
    () => rows.filter((row) => row.country === "Colombia"),
    [rows],
  );
  const florida = useMemo(
    () => rows.filter((row) => row.country === "United States"),
    [rows],
  );
  const stockoutTotal = useMemo(
    () => rows.reduce((sum, row) => sum + (row.stockout_events_count || 0), 0),
    [rows],
  );
  const priceAlertTotal = useMemo(
    () => rows.reduce((sum, row) => sum + (row.price_alert_events_count || 0), 0),
    [rows],
  );

  const refreshLabel = refreshStatusLabel(runMeta);

  return (
    <section className="wlp" aria-labelledby="wlp-title">
      <div className="wlp__welcome">
        <p className="wlp__kicker">Monday 07:00 · America/Bogota</p>
        <h2 id="wlp-title">Monday weekly ops &amp; finance report</h2>
        <p className="wlp__lead">
          For Mariana Restrepo, Felipe Guerrero, and Lucía Fernández — Purchase
          cost, Waste cost, Waste ratio, Stockout frequency, and Price alert
          frequency for each of the 14 locations, in COP or USD.
        </p>
      </div>

      <div className="wlp__dashboard" aria-label="Monday weekly ops and finance report">
        <div className="wlp__panel wlp__panel--span">
          <h3>Reporting period</h3>
          <AsyncPanel
            status={status}
            loadingLabel="Loading the Monday weekly report…"
            error={error}
            onRetry={retry}
            skeletonRows={2}
          >
            <dl className="wlp__stats">
              <div>
                <dt>Chain week starting (Monday)</dt>
                <dd>{weekStart ?? "—"}</dd>
              </div>
              <div className="wlp__stats-span">
                <dt>Period covered</dt>
                <dd className="wlp__period">{chainWeekWindowLabel(weekStart)}</dd>
              </div>
              <div>
                <dt>Locations with figures</dt>
                <dd>{rows.length}</dd>
              </div>
              <div>
                <dt>Colombia (COP)</dt>
                <dd>{colombia.length}</dd>
              </div>
              <div>
                <dt>Florida (USD)</dt>
                <dd>{florida.length}</dd>
              </div>
              <div>
                <dt>Stockout frequency (total)</dt>
                <dd>{stockoutTotal}</dd>
              </div>
              <div>
                <dt>Price alert frequency (total)</dt>
                <dd>{priceAlertTotal}</dd>
              </div>
            </dl>
            {refreshLabel ? <p className="wlp__run">{refreshLabel}</p> : null}
          </AsyncPanel>
        </div>

        <div className="wlp__panel wlp__panel--span">
          <h3>By location</h3>
          <AsyncPanel
            status={status}
            loadingLabel="Loading location figures…"
            error={error}
            onRetry={retry}
            skeletonRows={6}
          >
            {rows.length === 0 ? (
              <p className="wlp__empty">
                No location figures for this chain week yet. Ask Brasaland Digital
                to refresh the Monday report, then try again.
              </p>
            ) : (
              <div className="wlp__table-wrap">
                <table className="wlp__table">
                  <thead>
                    <tr>
                      <th scope="col">Location</th>
                      <th scope="col">Country</th>
                      <th scope="col">Currency</th>
                      <th scope="col">Purchase cost</th>
                      <th scope="col">Waste cost</th>
                      <th scope="col">Waste ratio</th>
                      <th scope="col">Stockout frequency</th>
                      <th scope="col">Price alert frequency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.location_id}>
                        <td>
                          <span className="wlp__loc-name">
                            {locationLabel(row.location_id)}
                          </span>
                        </td>
                        <td>{row.country}</td>
                        <td>
                          <span
                            className={
                              row.currency === "COP" ? "badge badge--cop" : "badge badge--usd"
                            }
                          >
                            {row.currency}
                          </span>
                        </td>
                        <td>{formatMoney(row.total_purchase_cost, row.currency)}</td>
                        <td>{formatMoney(row.total_waste_cost, row.currency)}</td>
                        <td>{formatRatio(row.waste_ratio)}</td>
                        <td>{row.stockout_events_count}</td>
                        <td>{row.price_alert_events_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AsyncPanel>
        </div>
      </div>
    </section>
  );
}
