import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { sampleAppointments, sampleClaims, sampleClinicians, sampleLocations, getReportingDate } from "@/lib/milestone-two/sample-data";
import { generateCMEReport, calculateDenialRate, denialRateByPayer, denialRateByLocation, noShowRateByLocation, calculateNoShowCost } from "@/lib/milestone-two/transformations";
import type { CMEStatus } from "@/lib/milestone-two/types";
import { DENIAL_RATE_ALERT_THRESHOLD, LICENCE_FIRST_ALERT_DAYS, LICENCE_URGENT_ALERT_DAYS, NO_SHOW_RATE_ALERT_THRESHOLD } from "@/lib/milestone-two/business-rules";
import "../operations.css";

const reportingDate = getReportingDate();
const overallDenialRate = calculateDenialRate(sampleClaims);
const denialByPayer = denialRateByPayer(sampleClaims);
const denialByLocation = denialRateByLocation(sampleClaims);
const noShowByLocation = noShowRateByLocation(sampleAppointments);
const noShowCount = sampleAppointments.filter((appointment) => appointment.status === "no_show").length;
const networkNoShowRate = sampleAppointments.length === 0 ? 0 : (noShowCount / sampleAppointments.length) * 100;
const cmeReport = generateCMEReport(sampleClinicians, reportingDate);
const weeklyNoShowCost = sampleLocations.reduce(
  (total, location) => total + calculateNoShowCost(sampleAppointments, location, reportingDate),
  0,
);
const statusLabel: Record<CMEStatus, string> = {
  on_track: "On track", at_risk: "At risk", overdue: "Overdue", complete: "Complete",
};
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export default function OperationsPage() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><Link href="/">HealthCore Digital</Link><span aria-hidden="true">/</span><strong>Operations</strong></div>
          <div className="topbar-actions"><span className="status-dot"><i></i>Illustrative data</span></div>
        </header>

        <section className="welcome-section operations-welcome">
          <div>
            <p className="eyebrow">Milestone two · Programming fundamentals</p>
            <h1>Operations signals.</h1>
            <p className="welcome-copy">Computed examples for revenue cycle, patient access, and CME compliance. Metrics update from the records and reporting date below.</p>
          </div>
          <div className="welcome-aside"><span className="signal-line" aria-hidden="true"></span><p><strong>{reportingDate}</strong><br /><span>reporting date</span></p></div>
        </section>

        <div className="operations-notice" role="note">
          <strong>Demonstration only:</strong> all records on this page are synthetic, illustrative sample data. No live patient or workforce data is connected.
        </div>

        <section className="operation-kpis" aria-label="Calculated operational metrics">
          <article className="operation-kpi"><span>Denial rate</span><strong>{overallDenialRate.toFixed(2)}%</strong><small>Calculated from {sampleClaims.length} sample claims · alert above {DENIAL_RATE_ALERT_THRESHOLD}%</small></article>
          <article className="operation-kpi"><span>No-show rate</span><strong>{networkNoShowRate.toFixed(2)}%</strong><small>{noShowCount} of {sampleAppointments.length} appointments · alert above {NO_SHOW_RATE_ALERT_THRESHOLD}%</small></article>
          <article className="operation-kpi"><span>Estimated weekly missed-slot value</span><strong>{currency.format(weeklyNoShowCost)}</strong><small>Seven calendar days ending {reportingDate}</small></article>
          <article className="operation-kpi"><span>CME clinicians at risk</span><strong>{cmeReport.filter((report) => report.complianceStatus === "at_risk" || report.complianceStatus === "overdue").length}</strong><small>Based on elapsed cycle pace and logged hours</small></article>
        </section>

        <section className="operations-grid" aria-label="Operational breakdowns">
          <article className="panel operations-panel">
            <div className="panel-heading"><div><p className="eyebrow">Revenue cycle</p><h2>Denial rate by payer</h2></div><span className="panel-count">{DENIAL_RATE_ALERT_THRESHOLD}% alert</span></div>
            <ul className="operations-list">{Object.entries(denialByPayer).map(([payer, rate]) => <li key={payer}><span>{payer}</span><strong className={rate > DENIAL_RATE_ALERT_THRESHOLD ? "operation-alert" : ""}>{rate.toFixed(2)}%</strong></li>)}</ul>
            <h3 className="operations-subheading">By location</h3>
            <ul className="operations-list">{Object.entries(denialByLocation).map(([locationId, rate]) => <li key={locationId}><span>{locationId}</span><strong>{rate.toFixed(2)}%</strong></li>)}</ul>
          </article>

          <article className="panel operations-panel">
            <div className="panel-heading"><div><p className="eyebrow">Patient access</p><h2>No-shows by clinic</h2></div><span className="panel-count">{NO_SHOW_RATE_ALERT_THRESHOLD}% alert</span></div>
            <ul className="operations-list">{sampleLocations.map((location) => <li key={location.locationId}><span>{location.name}</span><strong className={(noShowByLocation[location.locationId] ?? 0) > NO_SHOW_RATE_ALERT_THRESHOLD ? "operation-alert" : ""}>{(noShowByLocation[location.locationId] ?? 0).toFixed(2)}%</strong></li>)}</ul>
            <p className="operations-footnote">Estimated cost uses each clinic’s sample service fee and no-show appointments in the seven-day reporting window.</p>
          </article>
        </section>

        <section className="panel cme-panel">
          <div className="panel-heading"><div><p className="eyebrow">People &amp; workforce</p><h2>CME compliance and licence alerts</h2></div><span className="panel-count">{LICENCE_FIRST_ALERT_DAYS}-day licence notice</span></div>
          <div className="cme-table-wrap"><table className="cme-table"><thead><tr><th>Clinician</th><th>Clinic</th><th>CME hours</th><th>Cycle remaining</th><th>Status</th><th>Licence expiry</th></tr></thead><tbody>
            {cmeReport.map((report) => <tr key={report.clinicianId}><td>{report.fullName}<small>{report.role.replaceAll("_", " ")}</small></td><td>{report.locationId}</td><td>{report.hoursLogged} / {report.hoursRequired}<small>{report.hoursRemaining} remaining</small></td><td>{report.daysRemainingInCycle} days</td><td><span className={`cme-status cme-${report.complianceStatus}`}>{statusLabel[report.complianceStatus]}</span></td><td>{report.licenceExpiryDate}<small>{report.licenceDaysRemaining <= LICENCE_URGENT_ALERT_DAYS ? "Urgent · " : report.licenceDaysRemaining <= LICENCE_FIRST_ALERT_DAYS ? "Upcoming · " : ""}{report.licenceDaysRemaining} days</small></td></tr>)}
          </tbody></table></div>
          <p className="operations-footnote">Illustrative records only. A live compliance workflow requires verified jurisdiction-specific source data and human review.</p>
        </section>

        <footer className="main-footer"><span>HealthCore Digital · Internal operations workspace</span><span>Milestone functions · Synthetic data only · HIPAA / UK GDPR</span></footer>
      </main>
    </div>
  );
}
