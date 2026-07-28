import {
  groupShipmentsByStatus,
  calculateAverageShipmentDistance,
} from "@trackflow/logic";
import { getDemoShipments } from "../../lib/data";

export default function EnviosPage() {
  const shipments = getDemoShipments();
  const grouped = groupShipmentsByStatus(shipments);
  const avgDistance = calculateAverageShipmentDistance(shipments);

  const statusLabels: Record<string, string> = {
    Pending: "Pendiente",
    Assigned: "Asignado",
    "In transit": "En tránsito",
    Delivered: "Entregado",
    Failed: "Fallido",
  };

  const statusColors: Record<string, string> = {
    Pending: "bg-slate-100 text-slate-800",
    Assigned: "bg-blue-100 text-blue-800",
    "In transit": "bg-indigo-100 text-indigo-800",
    Delivered: "bg-green-100 text-green-800",
    Failed: "bg-red-100 text-red-800",
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8 md:py-10">
      <section className="rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 px-6 py-8 shadow-sm md:px-10">
        <p className="inline-block rounded-full border border-indigo-200 bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-900">
          Seguimiento público
        </p>
        <h1 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
          Seguimiento de Envíos
        </h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          Consulta el estado de los envíos en curso. Datos procesados con
          <code className="rounded bg-slate-200 px-1.5 py-0.5 text-sm"> @trackflow/logic</code>.
        </p>
      </section>

      {/* KPIs */}
      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total envíos</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{shipments.length}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Distancia promedio</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{avgDistance.toFixed(0)} km</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">En tránsito</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">
            {grouped["In transit"]?.length || 0}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Entregados</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {grouped["Delivered"]?.length || 0}
          </p>
        </article>
      </section>

      {/* Envíos por estado */}
      <section className="mt-8 space-y-6">
        {Object.entries(grouped).map(([status, statusShipments]) =>
          statusShipments.length > 0 ? (
            <div
              key={status}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    statusColors[status] || "bg-slate-100 text-slate-800"
                  }`}
                >
                  {statusLabels[status] || status} ({statusShipments.length})
                </span>
              </div>
              <div className="mt-4 divide-y divide-slate-100">
                {statusShipments.map((shipment) => (
                  <div key={shipment.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-slate-900">{shipment.id}</p>
                      <p className="text-sm text-slate-500">SKU: {shipment.sku}</p>
                    </div>
                    <div className="text-right text-sm text-slate-600">
                      <p>
                        {shipment.origin} → {shipment.destination.city}
                      </p>
                      <p className="text-xs text-slate-400">
                        {shipment.destination.distanceKm} km · {shipment.priority}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null
        )}
      </section>
    </main>
  );
}
