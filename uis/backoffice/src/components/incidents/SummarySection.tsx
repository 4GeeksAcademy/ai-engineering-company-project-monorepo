import { Component, useEffect, useState, type ReactNode } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import type { IncidentFilters, IncidentSummary } from "@repo/shared-types";
import { getIncidentSummary } from "../../lib/api";
import { describeError } from "../../lib/errors";
import IncidentSummaryPanel from "./IncidentSummaryPanel";

/** After this long the person is told it is taking longer than usual (the list keeps working). */
const SLOW_AFTER_MS = 4000;
/** After this long the request is given up and offered again. */
const GIVE_UP_AFTER_MS = 20000;

interface Props {
  filters: IncidentFilters;
  /** Bump it to reload the numbers (e.g. after a status change). */
  refreshKey: number;
  /** Do not ask while the filters are not valid (e.g. a reversed date range). */
  paused?: boolean;
}

/** A response that is not the summary we expect must not reach the panel and break it. */
function isSummary(value: unknown): value is IncidentSummary {
  const v = value as IncidentSummary | null;
  return (
    !!v &&
    typeof v.total === "number" &&
    typeof v.status_counts === "object" && v.status_counts !== null &&
    typeof v.category_counts === "object" && v.category_counts !== null &&
    typeof v.origin_counts === "object" && v.origin_counts !== null &&
    typeof v.branch_counts === "object" && v.branch_counts !== null &&
    Array.isArray(v.top_clients)
  );
}

/**
 * The summary cards, loaded on their own: while they load, if they are slow or if they fail, the
 * rest of the page (filters, list, status changes) keeps working. A failure shows what happened and
 * a retry, never a blank or broken page.
 */
export default function SummarySection({ filters, refreshKey, paused }: Props) {
  const [summary, setSummary] = useState<IncidentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (paused) return;
    const controller = new AbortController();
    let superseded = false; // a newer request (or leaving the page) replaced this one
    let gaveUp = false;
    setLoading(true);
    setSlow(false);
    const slowTimer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    const giveUpTimer = setTimeout(() => {
      gaveUp = true;
      controller.abort();
    }, GIVE_UP_AFTER_MS);

    getIncidentSummary(filters, controller.signal)
      .then((data) => {
        if (superseded) return;
        if (!isSummary(data)) throw new Error("unexpected summary");
        setSummary(data);
        setError(null);
      })
      .catch((err) => {
        if (superseded) return;
        setError(
          gaveUp
            ? "El resumen tarda demasiado en responder."
            : describeError(err, "No se pudo cargar el resumen."),
        );
      })
      .finally(() => {
        clearTimeout(slowTimer);
        clearTimeout(giveUpTimer);
        if (!superseded) {
          setLoading(false);
          setSlow(false);
        }
      });

    return () => {
      superseded = true;
      clearTimeout(slowTimer);
      clearTimeout(giveUpTimer);
      controller.abort();
    };
  }, [filters, refreshKey, attempt, paused]);

  const retry = () => setAttempt((n) => n + 1);

  return (
    <section aria-label="Resumen de incidencias" aria-busy={loading} data-summary-state={error ? "error" : loading ? "loading" : "ready"}>
      {loading && (
        <p role="status" className="mb-3 flex items-center gap-2 text-sm text-slate-300">
          <Loader2 className="animate-spin text-cyan-300" size={16} aria-hidden="true" />
          {summary ? "Actualizando el resumen…" : "Cargando el resumen…"}
          {slow && <span className="text-amber-200">Está tardando más de lo normal; la lista sigue disponible.</span>}
        </p>
      )}

      {error && (
        <div role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          <span>
            {summary ? "No se ha podido actualizar el resumen" : "El resumen no está disponible ahora mismo"}: {error}
            {summary && " Se muestran los últimos datos recibidos."}
          </span>
          <button
            type="button"
            onClick={retry}
            disabled={loading}
            className="flex items-center gap-1 rounded-full border border-amber-300/50 px-3 py-1 text-xs font-medium hover:bg-amber-400/20 disabled:opacity-60"
          >
            <RefreshCw size={12} aria-hidden="true" />
            {loading ? "Reintentando…" : "Reintentar"}
          </button>
        </div>
      )}

      {summary ? (
        <div className={loading || error ? "opacity-60 transition" : "transition"}>
          <SummaryBoundary resetKey={summary}>
            <IncidentSummaryPanel summary={summary} />
          </SummaryBoundary>
        </div>
      ) : (
        loading && <SummarySkeleton />
      )}
    </section>
  );
}

/** Placeholder with the shape of the cards, so the page does not jump when they arrive. */
function SummarySkeleton() {
  return (
    <div aria-hidden="true" className="grid animate-pulse grid-cols-2 gap-4 lg:grid-cols-6">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-[104px] rounded-2xl border border-slate-800 bg-slate-900/60" />
      ))}
    </div>
  );
}

/** If the panel itself throws while drawing, only the summary is replaced by a notice. */
class SummaryBoundary extends Component<{ children: ReactNode; resetKey: unknown }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(previous: { resetKey: unknown }) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  render() {
    if (this.state.failed)
      return (
        <p role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          No se pudo mostrar el resumen. El resto del panel sigue funcionando.
        </p>
      );
    return this.props.children;
  }
}
