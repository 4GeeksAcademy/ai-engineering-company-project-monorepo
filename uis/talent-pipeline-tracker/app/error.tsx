"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <h2 className="text-lg font-semibold text-red-300">
        Algo salió mal
      </h2>
      <p className="mt-2 text-sm text-slate-400">
        {error.message || "Error inesperado al cargar la página."}
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400"
      >
        Reintentar
      </button>
    </div>
  );
}
