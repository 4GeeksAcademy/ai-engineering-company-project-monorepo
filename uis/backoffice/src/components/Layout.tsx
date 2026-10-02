import { NavLink, Outlet } from "react-router-dom";
import { FileBarChart, LayoutDashboard } from "lucide-react";

const navItems = [
  { to: "/", label: "Inicio", icon: LayoutDashboard, end: true },
  { to: "/incidents", label: "Análisis de incidentes", icon: FileBarChart, end: false },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-900/60 px-4 py-6">
        <p className="px-2 text-xl font-black text-white">
          nexova<span className="text-cyan-400">.</span>
        </p>
        <p className="px-2 text-xs uppercase tracking-widest text-slate-500">Backoffice</p>
        <nav className="mt-8 space-y-1" aria-label="Navegación principal">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-cyan-400/10 text-cyan-300"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 px-8 py-10">
        <Outlet />
      </main>
    </div>
  );
}
