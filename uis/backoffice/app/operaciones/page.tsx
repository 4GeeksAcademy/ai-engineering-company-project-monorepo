import Link from "next/link";

export default function OperacionesPage() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Operaciones</h1>
      <p className="mt-2 text-sm text-slate-600">
        Vista inicial del modulo de operaciones. Aqui podras conectar KPIs y procesos logisticos.
      </p>
      <div className="mt-6">
        <Link
          href="/operaciones/proveedores"
          className="mr-2 inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
        >
          Ir a directorio de proveedores
        </Link>
        <Link
          href="/operaciones/incidencias"
          className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Ir a analisis de incidencias
        </Link>
      </div>
    </section>
  );
}
