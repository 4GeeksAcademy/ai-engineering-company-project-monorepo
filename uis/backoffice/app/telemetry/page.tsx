"use client";

// app/telemetry/page.tsx — Página de Reporte Técnico de Telemetría
//
// Muestra el dashboard completo de telemetría con métricas agregadas,
// gráficos y lista de eventos recientes.
//
// Ruta: /telemetry
// Fase 4 — Reporte técnico de telemetría
//
// NOTA: Usamos "use client" porque necesitamos next/dynamic con ssr: false
// (el dashboard accede a window y usa useEffect para cargar datos).

import dynamic from "next/dynamic";
import PageTracker from "@/components/PageTracker";

const TelemetryDashboard = dynamic(
  () => import("@/components/telemetry-dashboard"),
  {
    loading: () => (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-slate-400">Cargando reporte de telemetría...</p>
      </div>
    ),
    ssr: false,
  },
);

export default function TelemetryPage() {
  return (
    <>
      <PageTracker page="/telemetry" />
      <main className="mx-auto w-full max-w-7xl px-5 py-8 md:px-8 md:py-10">
      <section className="mb-8 rounded-3xl border border-indigo-200 bg-linear-to-r from-indigo-50 via-white to-cyan-50 px-6 py-8 shadow-sm md:px-10">
        <p className="inline-block rounded-full border border-indigo-200 bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-900">
          Application Telemetry
        </p>
        <h1 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
          Reporte Técnico de Telemetría
        </h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          Panel de monitoreo con métricas agregadas de todos los eventos de telemetría
          capturados desde el frontend (backoffice) y backend (API) de TrackFlow.
        </p>
      </section>

      <TelemetryDashboard />
    </main>
    </>
  );
}