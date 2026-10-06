"use client";

// Last line of defence: an unexpected rendering error shows this instead of a blank page.
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-xl rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200">
      <h1 className="text-xl font-semibold text-white">Algo ha salido mal</h1>
      <p className="mt-2 text-sm">Ha ocurrido un error inesperado al mostrar esta pantalla. Tus datos no se han perdido.</p>
      <button type="button" onClick={reset} className="mt-4 rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300">
        Reintentar
      </button>
    </div>
  );
}
