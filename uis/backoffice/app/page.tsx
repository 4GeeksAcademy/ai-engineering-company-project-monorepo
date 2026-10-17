import { buildTrackflowSmokeReport } from "@trackflow/logic";
import { SmokeChecksPanel } from "../components/SmokeChecksPanel";
import PageTracker from "@/components/PageTracker";

export default function Home() {
  const report = buildTrackflowSmokeReport();

  return (
    <>
      <PageTracker page="/" />
      <main className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8 md:py-10">
      <section className="rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 px-6 py-10 shadow-sm md:px-10">
        <p className="inline-block rounded-full border border-indigo-200 bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-900">
          Backoffice interno
        </p>
        <h1 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
          Centro de control operativo de TrackFlow
        </h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          Este panel conecta directamente con el modulo `@trackflow/logic` para mostrar los
          resultados de las pruebas de fuego del Hito 2 dentro de la interfaz.
        </p>
      </section>

      <div className="mt-8">
        <SmokeChecksPanel report={report} />
      </div>
    </main>
  );
}
