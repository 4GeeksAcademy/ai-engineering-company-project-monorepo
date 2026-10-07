import SuppliersClient from "./components/SuppliersClient";
import PageTracker from "@/components/PageTracker";

export default function SuppliersPage() {
  return (
    <>
      <PageTracker page="/suppliers" />
      <main className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8 md:py-10">
      <section className="mb-8 rounded-3xl border border-indigo-200 bg-linear-to-r from-indigo-50 via-white to-cyan-50 px-6 py-8 shadow-sm md:px-10">
        <p className="inline-block rounded-full border border-indigo-200 bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-900">
          Directorio Centralizado
        </p>
        <h1 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
          Proveedores de TrackFlow
        </h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          Gestiona los proveedores (carriers, software y suministros) de las operaciones en Los Ángeles y Zaragoza.
          La información mostrada proviene en tiempo real de nuestra API (FastAPI + TinyDB).
        </p>
      </section>

      <SuppliersClient />
    </main>
    </>
  );
}
