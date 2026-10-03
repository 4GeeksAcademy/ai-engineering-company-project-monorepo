import { STATUS_LABELS, type IncidentStatus } from "@repo/shared-types";

const STYLES: Record<IncidentStatus, string> = {
  open: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  in_progress: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
  resolved: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  discarded: "border-slate-600 bg-slate-700/30 text-slate-300",
};

export default function StatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
