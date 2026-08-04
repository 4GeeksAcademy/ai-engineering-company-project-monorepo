import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nexova Backoffice | Panel de Consultores de Selección',
  description: 'Sistema interno de gestión de candidatos, scoring automatizado e inteligibilidad de vacantes para consultores de Nexova.',
};

export default function BackofficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-slate-900 text-slate-100 antialiased">
        <div className="flex min-h-screen">
          {/* Sidebar exclusivo de Backoffice */}
          <aside className="w-64 border-r border-slate-800 bg-slate-950 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white">N</div>
                <span className="font-bold tracking-wider text-lg text-white">NEXOVA AI</span>
              </div>
              <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-4">Portal Consultores</p>
              <nav className="space-y-2">
                <a href="/backoffice" className="flex items-center gap-3 rounded-lg bg-blue-600/20 px-3 py-2.5 text-sm font-medium text-blue-400 border border-blue-500/30">
                  📊 Dashboard Candidatos
                </a>
                <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition">
                  💼 Vacantes Activas
                </a>
                <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition">
                  🎯 Matching & Scoring
                </a>
              </nav>
            </div>
            <div className="border-t border-slate-800 pt-4 text-xs text-slate-500">
              <p className="font-medium text-slate-400">40 Consultores Activos</p>
              <p>Nexova Ops v2.4</p>
            </div>
          </aside>

          {/* Main Area */}
          <div className="flex-1 flex flex-col">
            <header className="border-b border-slate-800 bg-slate-950/50 px-8 py-4 flex justify-between items-center">
              <h1 className="text-lg font-semibold text-slate-200">Panel de Operaciones de Selección</h1>
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                ● Hito 2 Core Module Active
              </span>
            </header>
            <main className="flex-1 p-8">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
