import type { OperationsSnapshot } from "@/lib/operations";

interface OperationsDashboardProps {
  data: OperationsSnapshot;
}

export function OperationsDashboard({ data }: OperationsDashboardProps) {
  const atRiskReports = data.people.cmeReport.filter(
    (row) => row.complianceStatus === "at_risk" || row.complianceStatus === "overdue"
  );

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-semibold text-slate-900">Welcome, HealthCore Digital</h2>
        <p className="mt-2 text-slate-600">
          Internal operations snapshot for Tom Callahan (Billing), Dr. Marcus Reid (Clinical Ops), and Diane
          Foster (People). Sample data as of {data.asOfDate}.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="billing-heading">
        <h3 id="billing-heading" className="text-lg font-semibold text-slate-900">
          Revenue Cycle &amp; Billing
        </h3>
        <p className="mt-1 text-sm text-slate-500">Tom Callahan · Claims denial monitoring</p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <MetricCard label="Overall denial rate" value={`${data.billing.overallDenial}%`} />
          <MetricCard
            label="Flagged payers (&gt;8%)"
            value={data.billing.flaggedPayers.length ? data.billing.flaggedPayers.join(", ") : "None"}
          />
        </dl>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Payer</th>
                <th className="px-3 py-2">Denial rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(data.billing.payerRates).map(([payer, rate]) => (
                <tr key={payer}>
                  <td className="px-3 py-2 font-medium">{payer}</td>
                  <td className="px-3 py-2">{rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="clinical-heading">
        <h3 id="clinical-heading" className="text-lg font-semibold text-slate-900">
          Clinical Operations
        </h3>
        <p className="mt-1 text-sm text-slate-500">Dr. Marcus Reid · No-show rates by location</p>
        <p className="mt-3 text-sm text-slate-700">
          Flagged locations (&gt;20%):{" "}
          {data.clinical.flaggedLocations.length
            ? data.clinical.flaggedLocations
                .map((id) => data.locationNames[id] ?? id)
                .join(", ")
            : "None"}
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">No-show rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(data.clinical.noShowRates).map(([locationId, rate]) => (
                <tr key={locationId}>
                  <td className="px-3 py-2 font-medium">{data.locationNames[locationId] ?? locationId}</td>
                  <td className="px-3 py-2">{rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="people-heading">
        <h3 id="people-heading" className="text-lg font-semibold text-slate-900">
          People &amp; Workforce (CME)
        </h3>
        <p className="mt-1 text-sm text-slate-500">Diane Foster · Clinicians at risk or overdue</p>
        <p className="mt-3 text-sm text-slate-700">
          {atRiskReports.length} clinician{atRiskReports.length === 1 ? "" : "s"} require attention
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Clinician</th>
                <th className="px-3 py-2">Hours remaining</th>
                <th className="px-3 py-2">Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {atRiskReports.map((row) => (
                <tr key={row.clinicianId}>
                  <td className="px-3 py-2 font-medium">{row.fullName}</td>
                  <td className="px-3 py-2">{row.hoursRemaining} hours</td>
                  <td className="px-3 py-2">{data.cmeStatusLabels[row.complianceStatus] ?? row.complianceStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
