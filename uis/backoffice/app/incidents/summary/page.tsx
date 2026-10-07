// app/incidents/summary/page.tsx — Página de resumen estadístico de incidencias
//
// Muestra métricas agregadas con gráficos de barras.
// Ruta PROTEGIDA — el componente usa JWT para autenticación.
//
// Lazy Loading: incident-summary se carga bajo demanda porque:
//   - Contiene gráficos de barras (BarChart) y procesamiento de datos agregados
//   - No está en la ruta principal ni en la carga inicial del backoffice
//   - Diferir su carga reduce el bundle JS inicial y el tiempo de interactividad (TTI)

import dynamic from "next/dynamic";
import PageTracker from "@/components/PageTracker";

const IncidentSummary = dynamic(
  () => import("@/components/incident-summary"),
  {
    loading: () => (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-slate-400">Cargando resumen estadístico...</p>
      </div>
    ),
    ssr: false,
  },
);

export default function IncidentsSummaryPage() {
  return (
    <>
      <PageTracker page="/incidents/summary" />
      <main className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8 md:py-10">
      <section className="mb-8 rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 px-6 py-8 shadow-sm md:px-10">
        <p className="inline-block rounded-full border border-indigo-200 bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-900">
          Métricas
        </p>
        <h1 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
          Resumen de incidencias
        </h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          Panel estadístico con métricas agregadas de todas las incidencias registradas
          en el sistema centralizado de TrackFlow.
        </p>
      </section>

      <IncidentSummary />
    </main>
  );
}