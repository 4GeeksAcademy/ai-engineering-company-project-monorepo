// app/pipeline/page.tsx — Dashboard del pipeline ETL
//
// Muestra el estado del pipeline de telemetría a reporting:
// estadísticas resumidas, historial de ejecuciones y KPIs semanales.
//
// Ruta: /pipeline
// Componente: PipelineStatusPanel (cliente)
//
// Sigue el patrón de app/incidents/page.tsx.

import { PipelineStatusPanel } from "@/components/PipelineStatusPanel";
import PageTracker from "@/components/PageTracker";

export default function PipelinePage() {
  return (
    <>
      <PageTracker page="/pipeline" />
      <main className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8 md:py-10">
        <section className="mb-8 rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 px-6 py-8 shadow-sm md:px-10">
          <p className="inline-block rounded-full border border-indigo-200 bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-900">
            Monitoreo interno
          </p>
          <h1 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
            Pipeline ETL — Dashboard
          </h1>
          <p className="mt-3 max-w-3xl text-slate-700">
            Visualiza el estado del pipeline ETL que transforma eventos de telemetría
            en KPIs de inventario. Los datos provienen de los endpoints en la API FastAPI
            que consultan directamente la base de datos <code className="rounded bg-indigo-100 px-1.5 py-0.5 text-sm font-mono text-indigo-800">reporting.db</code>.
          </p>
        </section>

        <PipelineStatusPanel />
      </main>
    </>
  );
}