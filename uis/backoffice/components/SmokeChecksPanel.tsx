import { SmokeReport } from "@trackflow/logic";

interface SmokeChecksPanelProps {
  report: SmokeReport;
}

export function SmokeChecksPanel({ report }: SmokeChecksPanelProps) {
  const passedChecks = report.checks.filter((check) => check.passed).length;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-2xl font-bold text-slate-900">Pruebas de fuego de Hito 2</h2>
      <p className="mt-2 text-slate-600">
        Este bloque se renderiza importando el script de logica desde el paquete compartido,
        sin copiar reglas de negocio.
      </p>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Checks aprobados</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {passedChecks}/{report.checks.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Costo envio</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">${report.shippingCostUSD}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Score carrier</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{report.carrierScore}/100</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Mejor carrier</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{report.bestCarrierName}</p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 text-sm text-slate-500">
              <th className="py-3 pr-4 font-medium">Check</th>
              <th className="py-3 pr-4 font-medium">Estado</th>
              <th className="py-3 font-medium">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {report.checks.map((check) => (
              <tr key={check.id} className="border-b border-slate-100 align-top">
                <td className="py-3 pr-4 font-medium text-slate-900">{check.title}</td>
                <td className="py-3 pr-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      check.passed
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {check.passed ? "Aprobado" : "Fallo"}
                  </span>
                </td>
                <td className="py-3 text-slate-600">{check.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Generado: {new Date(report.generatedAt).toLocaleString("es-ES")}
      </p>
    </section>
  );
}
