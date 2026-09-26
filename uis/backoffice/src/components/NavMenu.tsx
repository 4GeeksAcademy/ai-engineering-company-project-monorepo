"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/incidents", label: "Análisis de incidencias" },
];

export function NavMenu() {
  const pathname = usePathname();
  return (
    <nav aria-label="Menú principal">
      <ul>
        {LINKS.map(({ href, label }) => (
          <li key={href}>
            <Link href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
