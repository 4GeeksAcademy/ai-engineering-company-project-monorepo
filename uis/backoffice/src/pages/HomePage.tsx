import { Link } from "react-router-dom";
import { FileBarChart } from "lucide-react";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-bold text-white">Backoffice de Nexova</h1>
      <p className="mt-2 text-slate-400">Herramientas internas para el equipo de operaciones.</p>

      <Link
        to="/incidents"
        className="mt-8 flex max-w-sm items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-cyan-400/40"
      >
        <FileBarChart className="text-cyan-400" size={28} />
        <div>
          <p className="font-semibold text-white">Análisis de incidentes</p>
          <p className="text-sm text-slate-400">Valida y analiza exportes de tickets de soporte</p>
        </div>
      </Link>
    </div>
  );
}
