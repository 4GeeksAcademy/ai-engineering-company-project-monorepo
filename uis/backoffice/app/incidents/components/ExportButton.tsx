"use client";

interface ExportButtonProps {
  disabled?: boolean;
}

export function ExportButton({ disabled }: ExportButtonProps) {
  const handleDownload = async () => {
    const response = await fetch("/api/incidents/results/export");

    if (!response.ok) {
      throw new Error("No fue posible exportar el archivo.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "results.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-indigo-400 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={() => {
        handleDownload().catch(() => {
          window.alert("No se pudo descargar el CSV. Ejecuta un analisis primero.");
        });
      }}
    >
      Download CSV
    </button>
  );
}
