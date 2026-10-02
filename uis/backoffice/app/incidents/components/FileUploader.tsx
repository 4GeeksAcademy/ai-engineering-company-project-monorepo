"use client";

import { useRef, useState } from "react";

interface FileUploaderProps {
  loading: boolean;
  onAnalyze: (file: File) => void;
}

export function FileUploader({ loading, onAnalyze }: FileUploaderProps) {
  const [selected, setSelected] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = (file: File | null) => {
    if (!file) {
      return;
    }
    setSelected(file);
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-2xl font-bold text-slate-900">Cargar archivo de incidencias</h2>
      <p className="mt-2 text-slate-600">
        Sube un archivo CSV para ejecutar el analisis interno sin exponer datos sensibles.
      </p>

      <div
        className={`mt-5 rounded-2xl border-2 border-dashed p-8 text-center transition ${
          dragging
            ? "border-indigo-500 bg-indigo-50"
            : "border-slate-300 bg-slate-50 hover:border-indigo-400"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0] ?? null;
          onPick(file);
        }}
      >
        <p className="text-sm text-slate-700">
          Arrastra tu CSV aqui o
          <button
            type="button"
            className="ml-1 font-semibold text-indigo-700 underline"
            onClick={() => inputRef.current?.click()}
          >
            selecciona un archivo
          </button>
        </p>
        {selected && (
          <p className="mt-3 text-sm font-medium text-slate-900">Archivo seleccionado: {selected.name}</p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => onPick(event.target.files?.[0] ?? null)}
      />

      <button
        type="button"
        className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
        disabled={!selected || loading}
        onClick={() => selected && onAnalyze(selected)}
      >
        {loading ? "Analizando..." : "Analyze"}
      </button>
    </section>
  );
}
