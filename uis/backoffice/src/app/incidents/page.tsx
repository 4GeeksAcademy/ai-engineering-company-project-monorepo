import { BackofficeHeader } from "@/components/backoffice-header";
import { IncidentBoard } from "@/components/incidents/IncidentBoard";

export default function IncidentsPage() {
  return (
    <div className="backoffice-page">
      <BackofficeHeader activeView="incidents" badge="Gestor de Incidencias" />

      <main className="container bo-main">
        <IncidentBoard />
      </main>
    </div>
  );
}