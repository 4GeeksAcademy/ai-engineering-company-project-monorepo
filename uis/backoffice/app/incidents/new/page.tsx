// app/incidents/new/page.tsx — Página de creación de incidencias
//
// Renderiza el formulario de creación de incidencias.
// Ruta PROTEGIDA — solo usuarios autenticados (el formulario usa JWT).
//
// Lazy Loading: incident-form se carga bajo demanda porque:
//   - Es un formulario completo con validaciones, solo se monta al navegar a crear incidencia
//   - No está en la ruta de inicio ni en la carga inicial
//   - Diferir su carga reduce el bundle JS inicial

import dynamic from "next/dynamic";

const IncidentForm = dynamic(
  () => import("@/components/incident-form"),
  {
    loading: () => (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-slate-400">Cargando formulario...</p>
      </div>
    ),
    ssr: false,
  },
);

export default function NewIncidentPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8 md:px-8 md:py-10">
      <section className="rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 px-6 py-8 shadow-sm md:px-10">
        <p className="inline-block rounded-full border border-indigo-200 bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-900">
          Gestión de incidencias
        </p>
        <h1 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
          Nueva incidencia
        </h1>
        <p className="mt-3 text-slate-700">
          Registra una nueva incidencia en el sistema centralizado de TrackFlow.
          Todos los campos marcados con * son obligatorios.
        </p>
      </section>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm md:px-8">
        <IncidentForm />
      </div>
    </main>
  );
}