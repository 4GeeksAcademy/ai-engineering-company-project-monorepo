import type { HistoryEntry } from "@repo/shared-types";
import { formatDateTime } from "../../lib/format";
import { describeHistoryEntry } from "../../lib/labels";

export default function HistoryTimeline({ history }: { history: HistoryEntry[] }) {
  return (
    <section aria-label="Historial" className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-white">Historial</h2>
      <ol className="mt-4 space-y-3">
        {[...history].reverse().map((entry, index) => (
          <li key={`${entry.at}-${index}`} className="border-l-2 border-slate-700 pl-4 text-sm">
            <p className="text-slate-200">{describeHistoryEntry(entry)}</p>
            <p className="text-xs text-slate-500">
              <time dateTime={entry.at}>{formatDateTime(entry.at)}</time> · {entry.actor}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
