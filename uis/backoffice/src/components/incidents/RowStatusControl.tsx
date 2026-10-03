import { useState } from "react";
import { Loader2 } from "lucide-react";
import { STATUS_LABELS, type IncidentListItem, type IncidentStatus } from "@repo/shared-types";
import StatusBadge from "./StatusBadge";

interface Props {
  item: IncidentListItem;
  /** The status being saved (shown optimistically), if a change is in flight. */
  saving?: IncidentStatus;
  /** The last change of this row failed and was undone. */
  failed?: boolean;
  onChange: (item: IncidentListItem, target: IncidentStatus) => void;
}

// Moving to these is definitive (nothing leaves them), so it asks first.
const FINAL: IncidentStatus[] = ["resolved", "discarded"];

/** The status of a row, and the way to change it without leaving the list. */
export default function RowStatusControl({ item, saving, failed, onChange }: Props) {
  const [confirming, setConfirming] = useState<IncidentStatus | null>(null);
  const options = item.allowed_transitions;

  if (saving) {
    return (
      <div className="flex items-center gap-2" aria-live="polite">
        <StatusBadge status={item.status} />
        <Loader2 className="animate-spin text-cyan-300" size={14} aria-hidden="true" />
        <span className="text-xs text-slate-400">Guardando…</span>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="space-y-2 text-xs" role="group" aria-label={`Confirmar el cambio de ${item.id}`}>
        <p className="text-slate-200">
          ¿Pasar a <strong>{STATUS_LABELS[confirming]}</strong>? Es definitivo.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              const target = confirming;
              setConfirming(null);
              onChange(item, target);
            }}
            className="rounded-full bg-cyan-400 px-3 py-1 font-semibold text-slate-950 hover:bg-cyan-300"
          >
            Confirmar
          </button>
          <button type="button" onClick={() => setConfirming(null)} className="rounded-full px-3 py-1 text-slate-300 hover:text-white">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge status={item.status} />
      {options.length > 0 && (
        <select
          aria-label={`Cambiar el estado de ${item.id}`}
          value=""
          onChange={(e) => {
            const target = e.target.value as IncidentStatus;
            if (!target) return;
            if (FINAL.includes(target)) setConfirming(target);
            else onChange(item, target);
          }}
          className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
        >
          <option value="">Cambiar…</option>
          {options.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      )}
      {failed && <span className="text-xs text-rose-300">No se guardó</span>}
    </div>
  );
}
