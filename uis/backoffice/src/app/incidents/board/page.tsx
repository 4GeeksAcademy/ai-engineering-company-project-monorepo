import { IncidentList } from "@/components/incident-list";
import { IncidentSummaryPanel } from "@/components/incident-summary";

export default function IncidentBoardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Incidents</h2>
        <p className="mt-2 text-muted-foreground">
          Review registered incidents, update status, and read the network totals.
        </p>
      </div>
      <IncidentSummaryPanel />
      <IncidentList />
    </div>
  );
}
