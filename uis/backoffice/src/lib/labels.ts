// Texts the incident screens build from the data, moved out of the components so they can be tested on their own.
import { STATUS_LABELS, type HistoryEntry, type IncidentStatus } from "@repo/shared-types";

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

/** One line of the incident history: what happened, in Spanish. */
export function describeHistoryEntry(entry: HistoryEntry): string {
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

/** The button text for moving an incident from `current` to `target`. */
export function statusActionLabel(current: IncidentStatus, target: IncidentStatus): string {
  if (target === "open") return current === "in_progress" ? "Devolver a abierta" : "Reabrir";
  return { in_progress: "Poner en curso", resolved: "Resolver", discarded: "Descartar" }[target];
}
