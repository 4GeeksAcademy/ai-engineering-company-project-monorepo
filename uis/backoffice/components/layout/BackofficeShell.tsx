"use client";

import Link from "next/link";
import { appUrls } from "@/lib/app-urls";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/utilities", label: "Utilities" },
] as const;

export function BackofficeShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">HealthCore Digital</p>
            <h1 className="text-lg font-semibold">Operations Backoffice</h1>
          </div>
          <nav className="flex flex-wrap items-center gap-4 text-sm" aria-label="Backoffice navigation">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="text-slate-200 hover:text-white hover:underline">
                {item.label}
              </Link>
            ))}
            <a href={appUrls.website} className="text-slate-400 hover:text-white">
              Public site
            </a>
            <a href={appUrls.tracker} className="text-slate-400 hover:text-white">
              Talent tracker
            </a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
