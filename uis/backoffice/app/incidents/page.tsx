// app/incidents/page.tsx — Página principal del gestor de incidencias
//
// Muestra la lista completa de incidencias con filtros,
// cambio de estado y acceso al formulario de creación.
//
// Ruta PROTEGIDA — el componente usa JWT para autenticación.

import IncidentList from "@/components/incident-list";

export default function IncidentsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8 md:py-10">
      <section className="mb-8 rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 px-6 py-8 shadow-sm md:px-10">
        <p className="inline-block rounded-full border border-indigo-200 bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-900">
          Gestión Centralizada
        </p>
        <h1 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
          Incidencias TrackFlow
        </h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          Gestiona las incidencias de las operaciones en Los Ángeles y Zaragoza.
          Puedes crear, filtrar y cambiar el estado de cada incidencia.
          La información proviene en tiempo real de nuestra API (FastAPI + TinyDB).
        </p>
      </section>

      <IncidentList />
    </main>
  );
}
