import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none aria-[invalid=true]:border-rose-400";

/** Label + control + inline error, wired for screen readers (the control must use `id`, `aria-invalid` and `aria-describedby`). */
export function Field({
  id,
  label,
  error,
  hint,
  required,
  highlight,
  highlightNote,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  /** Marks the field as mandatory, visibly ("obligatorio") and for assistive technology (on the control, via `required`). */
  required?: boolean;
  /** Draws attention to the field (e.g. the branch when the incident comes from a branch). */
  highlight?: boolean;
  highlightNote?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-highlighted={highlight ? "true" : undefined}
      className={`text-sm text-slate-300 ${
        highlight ? "rounded-xl border-2 border-amber-400/70 bg-amber-400/5 p-3 shadow-[0_0_0_4px_rgba(251,191,36,0.08)]" : ""
      }`}
    >
      <label htmlFor={id} className="flex items-baseline gap-2">
        <span className={highlight ? "font-semibold text-amber-200" : undefined}>{label}</span>
        {required ? (
          <span className="text-xs font-medium text-cyan-300">obligatorio</span>
        ) : (
          <span className="text-xs text-slate-500">opcional</span>
        )}
      </label>
      {highlight && highlightNote && <p className="mt-1 text-xs text-amber-200/90">{highlightNote}</p>}
      <div className="mt-1">{children}</div>
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="mt-1 flex items-start gap-1 text-xs text-rose-300">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export function ErrorBanner({
  message,
  onRetry,
  retrying,
  onDismiss,
}: {
  message: string;
  /** Adds a "Reintentar" button. */
  onRetry?: () => void;
  retrying?: boolean;
  /** Adds a "Cerrar" button. */
  onDismiss?: () => void;
}) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
      <span>{message}</span>
      <span className="flex gap-2">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="rounded-full border border-rose-400/50 px-3 py-1 text-xs font-medium text-rose-100 hover:bg-rose-500/20 disabled:opacity-60"
          >
            {retrying ? "Reintentando…" : "Reintentar"}
          </button>
        )}
        {onDismiss && (
          <button type="button" onClick={onDismiss} className="rounded-full px-3 py-1 text-xs text-rose-200 hover:text-white">
            Cerrar
          </button>
        )}
      </span>
    </div>
  );
}
