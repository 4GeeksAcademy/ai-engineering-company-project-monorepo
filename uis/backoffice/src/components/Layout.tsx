"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  PackageMinus,
  PackagePlus,
  ScrollText,
  Truck,
  UserCircle,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";

const navItems = [
  { href: "/", label: "Inicio", icon: LayoutDashboard, end: true },
  { href: "/incidents", label: "Incidencias", icon: ClipboardList, end: false, exclude: "/incidents/analysis" },
  { href: "/incidents/analysis", label: "Análisis de incidentes", icon: FileBarChart, end: false },
  { href: "/suppliers", label: "Proveedores", icon: Truck, end: false },
  { href: "/inventory/products", label: "Inventario de activos", icon: Boxes, end: true },
  { href: "/inventory/orders/inbound", label: "Entrada de activos", icon: PackagePlus, end: true },
  { href: "/inventory/orders/outbound", label: "Salida de activos", icon: PackageMinus, end: true },
  { href: "/inventory/orders", label: "Historial de órdenes", icon: ScrollText, end: true },
  { href: "/account/profile", label: "Mi perfil", icon: UserCircle, end: false },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* sticky + h-screen: the menu is as tall as the window, not as the page, so its user block does not slide down (a layout shift) when a long table loads. */}
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-slate-800 bg-slate-900/60 px-4 py-6">
        <p className="px-2 text-xl font-black text-white">
          nexova<span className="text-cyan-400">.</span>
        </p>
        <p className="px-2 text-xs uppercase tracking-widest text-slate-400">Backoffice</p>
        <nav className="mt-8 space-y-1" aria-label="Navegación principal">
          {navItems.map(({ href, label, icon: Icon, end, exclude }) => {
            const isActive =
              !(exclude && pathname.startsWith(exclude)) &&
              (end ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive ? "bg-cyan-400/10 text-cyan-300" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-slate-800 px-2 pt-4">
          <p className="truncate text-sm font-medium text-white" data-testid="current-user">
            {user?.profile.name ?? user?.email}
          </p>
          <p className="truncate text-xs text-slate-400">{user?.email}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-3 flex items-center gap-2 text-sm text-slate-300 hover:text-white"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 px-8 py-10">{children}</main>
    </div>
  );
}
