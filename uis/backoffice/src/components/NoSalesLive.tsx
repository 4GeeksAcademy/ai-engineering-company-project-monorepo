import { useEffect, useRef, useState } from "react";
import {
  apiRequest,
  fetchLocationsOverview,
  toUserFacingMessage,
  type Location,
} from "../lib/api";
import {
  defaultSaleAmount,
  reduceOpsAlerts,
  toastForFrame,
  type OpsAlert,
  type OpsAlertSnapshot,
  type ParsedSse,
} from "../lib/noSalesAlerts";
import { connectOpsAlertStream, type StreamStatus } from "../lib/noSalesStream";
import "./NoSalesLive.css";

type Toast = {
  id: number;
  tone: "alert" | "clear";
  text: string;
};

const STATUS_LABEL: Record<StreamStatus, string> = {
  connecting: "Connecting",
  live: "Live",
  reconnecting: "Reconnecting",
};

export function NoSalesLive() {
  const [alerts, setAlerts] = useState<OpsAlert[]>([]);
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const [windowMinutes, setWindowMinutes] = useState(30);
  const [openHour, setOpenHour] = useState(11);
  const [closeHour, setCloseHour] = useState(22);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState("co-med-centro");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [busy, setBusy] = useState<"quiet" | "resume" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const sawStream = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    void connectOpsAlertStream(
      {
        onStatus: setStatus,
        onEvent: (frame) => {
          if (
            frame.event === "ops_alert_snapshot" ||
            frame.event === "no_sales_alert" ||
            frame.event === "no_sales_cleared"
          ) {
            sawStream.current = true;
          }
          applyFrame(frame);
        },
      },
      controller.signal,
    );
    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const snapshot = await apiRequest<OpsAlertSnapshot>("/realtime/ops-alerts");
        if (cancelled || sawStream.current) {
          return;
        }
        setWindowMinutes(snapshot.window_minutes);
        setOpenHour(snapshot.open_hour);
        setCloseHour(snapshot.close_hour);
        setAlerts(Array.isArray(snapshot.alerts) ? snapshot.alerts : []);
      } catch {
        /* The stream snapshot still fills the list when the channel connects. */
      }
      try {
        const overview = await fetchLocationsOverview();
        if (!cancelled) {
          setLocations(overview.locations ?? []);
        }
      } catch {
        /* The simulator can still target the default Medellín Centro id. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function applyFrame(frame: ParsedSse) {
    if (frame.event === "ops_alert_snapshot") {
      const minutes = frame.data.window_minutes;
      const open = frame.data.open_hour;
      const close = frame.data.close_hour;
      if (typeof minutes === "number") {
        setWindowMinutes(minutes);
      }
      if (typeof open === "number") {
        setOpenHour(open);
      }
      if (typeof close === "number") {
        setCloseHour(close);
      }
    }
    setAlerts((current) => reduceOpsAlerts(current, frame));
    const toast = toastForFrame(frame);
    if (!toast) {
      return;
    }
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, ...toast }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 6000);
  }

  const selected = locations.find((location) => location.id === locationId);
  const currency = selected?.currency ?? "COP";

  async function run(action: "quiet" | "resume") {
    setBusy(action);
    setActionError(null);
    try {
      await apiRequest("/realtime/ops-alerts/simulate", {
        method: "POST",
        body: JSON.stringify(
          action === "quiet"
            ? { location_id: locationId, action }
            : {
                location_id: locationId,
                action,
                amount: defaultSaleAmount(currency),
                currency,
              },
        ),
      });
    } catch (error: unknown) {
      setActionError(toUserFacingMessage(error, "The simulator could not reach Brasaland Digital."));
    } finally {
      setBusy(null);
    }
  }

  const banner =
    alerts.length === 0
      ? null
      : alerts.length === 1
        ? alerts[0]?.message
        : `${alerts.length} locations have no sales during opening hours.`;

  return (
    <section className="nosales" aria-labelledby="nosales-title">
      <div className="nosales__head">
        <div>
          <p className="nosales__kicker">Restaurant operations · Felipe Guerrero</p>
          <h2 id="nosales-title">Live no-sales alerts</h2>
          <p className="nosales__lead">
            An open restaurant with no sale for {windowMinutes} minutes between {openHour}:00 and{" "}
            {closeHour}:00 local time shows up here. Colombia uses COP, Florida uses USD. The alert
            clears when that location records a sale.
          </p>
        </div>
        <p className={`nosales__status nosales__status--${status}`}>
          <span className="nosales__dot" aria-hidden="true" />
          {STATUS_LABEL[status]}
        </p>
      </div>

      {banner ? (
        <div className="nosales__banner" role="status">
          {banner}
        </div>
      ) : (
        <p className="nosales__clear" role="status">
          No open location is quiet right now.
        </p>
      )}

      <div className="nosales__toasts" aria-live="polite">
        {toasts.map((toast) => (
          <p key={toast.id} className={`nosales__toast nosales__toast--${toast.tone}`}>
            {toast.text}
          </p>
        ))}
      </div>

      <ul className="nosales__list">
        {alerts.map((alert) => (
          <li key={alert.location_id}>
            <span className="nosales__name">{alert.location_name}</span>
            <span className="nosales__meta">
              {alert.city} · {alert.region} ·{" "}
              <span className={alert.currency === "COP" ? "badge badge--cop" : "badge badge--usd"}>
                {alert.currency}
              </span>
            </span>
            <span className="nosales__quiet">
              No sales for {alert.quiet_minutes} min (window {alert.window_minutes} min)
            </span>
          </li>
        ))}
      </ul>

      <form
        className="nosales__sim"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <p className="nosales__sim-title">Grader simulator</p>
        <p className="nosales__sim-copy">
          No POS feed required. Quiet marks the restaurant silent. Record a sale uses the same
          internal event the sales feed will call, and the list updates from the live stream.
        </p>
        <label className="nosales__field">
          Location
          <select value={locationId} onChange={(event) => setLocationId(event.target.value)}>
            {(locations.length > 0
              ? locations
              : [{ id: "co-med-centro", name: "Medellín Centro", currency: "COP" } as Location]
            ).map((location) => (
              <option key={location.id} value={location.id}>
                {location.name} ({location.currency})
              </option>
            ))}
          </select>
        </label>
        <div className="nosales__actions">
          <button type="button" onClick={() => void run("quiet")} disabled={busy !== null}>
            {busy === "quiet" ? "Marking quiet…" : "Simulate no sales"}
          </button>
          <button type="button" onClick={() => void run("resume")} disabled={busy !== null}>
            {busy === "resume" ? "Recording sale…" : `Record a sale (${defaultSaleAmount(currency)} ${currency})`}
          </button>
        </div>
        {actionError ? <p className="nosales__error">{actionError}</p> : null}
      </form>
    </section>
  );
}
