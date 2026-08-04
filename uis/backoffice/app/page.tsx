export default function BackofficeHome() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-white mb-2">Bienvenido al Portal de Selección de Nexova</h2>
        <p className="text-slate-400 text-sm max-w-2xl">
          Este panel permite a los consultores procesar candidatos de forma automatizada, consultar puntuaciones de compatibilidad contra vacantes abiertas y visualizar reportes en tiempo real.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Candidatos en Base</p>
          <p className="text-3xl font-extrabold text-white mt-2">1,248</p>
          <span className="text-xs text-emerald-400 font-medium">↑ 12% este mes</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vacantes Abiertas</p>
          <p className="text-3xl font-extrabold text-white mt-2">42</p>
          <span className="text-xs text-blue-400 font-medium">Valencia & Miami</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Score Promedio Match</p>
          <p className="text-3xl font-extrabold text-white mt-2">78.4 / 100</p>
          <span className="text-xs text-amber-400 font-medium">Evaluación en tiempo real</span>
        </div>
      </div>
    </div>
  );
}
