"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: "/", label: "Inicio" },
  { href: "/leads", label: "Leads" },
  { href: "/operaciones", label: "Operaciones" },
  { href: "/operaciones/proveedores", label: "Directorio de proveedores" },
  { href: "/operaciones/incidencias", label: "Analisis de incidencias" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegacion dashboard">
      <ul className="space-y-2 text-sm">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={
                  isActive
                    ? "block rounded-lg bg-slate-800 px-3 py-2 font-medium text-white"
                    : "block rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white"
                }
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
