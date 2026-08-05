import { BackofficeHeader } from "@/components/backoffice-header";
import { IncidentsAnalyzer } from "@/components/incidents-analyzer";

export default function IncidentsPage() {
  return (
    <div className="backoffice-page">
      <BackofficeHeader activeView="incidents" badge="Incidents analysis online" />

      <main className="container bo-main">
        <IncidentsAnalyzer />
      </main>
    </div>
  );
}