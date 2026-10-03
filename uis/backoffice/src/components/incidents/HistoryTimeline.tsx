import { STATUS_LABELS, type HistoryEntry } from "@repo/shared-types";

const FIELD_LABELS: Record<string, string> = {
  title: "título",
  description: "descripción",
  category: "categoría",
  origin: "origen",
  branch: "sucursal",
  client_company: "empresa cliente",
  agent_id: "agente",
  customer_email: "email del cliente",
};

function describe(entry: HistoryEntry): string {
  switch (entry.kind) {
    case "created":
      return "Incidencia creada";
    case "imported":
      return "Importada desde el histórico CSV";
    case "edited":
      return `Editada: ${entry.fields.map((f) => FIELD_LABELS[f] ?? f).join(", ")}`;
    case "status_changed": {
      const from = entry.from_status ? STATUS_LABELS[entry.from_status] : "—";
      const to = entry.to_status ? STATUS_LABELS[entry.to_status] : "—";
      return `Estado: ${from} → ${to}${entry.note ? ` (${entry.note})` : ""}`;
    }
  }
}

export default function HistoryTimeline({ history }: { history: HistoryEntry[] }) {
  return (
    <section aria-label="Historial" className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-white">Historial</h2>
      <ol className="mt-4 space-y-3">
        {[...history].reverse().map((entry, index) => (
          <li key={`${entry.at}-${index}`} className="border-l-2 border-slate-700 pl-4 text-sm">
            <p className="text-slate-200">{describe(entry)}</p>
            <p className="text-xs text-slate-500">
              <time dateTime={entry.at}>{new Date(entry.at).toLocaleString("es-ES")}</time> · {entry.actor}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
