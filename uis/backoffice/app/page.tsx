import Link from "next/link";
import { LeadValidationPanel } from "./components/LeadValidationPanel";

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Dashboard</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Bienvenido al Backoffice de TrackFlow</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
          Esta vista centraliza herramientas internas para validar leads y apoyar operaciones comerciales entre Estados
          Unidos y España.
        </p>
        <div className="mt-5">
          <Link
            href="/candidaturas"
            className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Ir a gestion de candidaturas
          </Link>
        </div>
      </section>

      <LeadValidationPanel />
    </div>
  );
}
