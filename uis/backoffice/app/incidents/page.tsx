import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { IncidentAnalysis } from "./incident-analysis";

export default function IncidentsPage() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><Link href="/">HealthCore Digital</Link><span aria-hidden="true">/</span><strong>Incident analysis</strong></div>
          <div className="topbar-actions"><span className="status-dot"><i></i>Privacy-first analysis</span></div>
        </header>
        <section className="welcome-section incident-welcome">
          <div>
            <p className="eyebrow">Patient Experience</p>
            <h1>Incident analysis.</h1>
            <p className="welcome-copy">Upload a HealthCore incident CSV to review network trends. Patient identifiers are never included in results or exports.</p>
          </div>
        </section>
        <IncidentAnalysis />
        <footer className="main-footer"><span>HealthCore Digital · Internal operations workspace</span><span>Aggregate metrics only · HIPAA / UK GDPR</span></footer>
      </main>
    </div>
  );
}
