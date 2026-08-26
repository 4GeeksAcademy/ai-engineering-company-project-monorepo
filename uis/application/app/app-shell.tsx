"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "./theme-toggle";

const BACKOFFICE = process.env.NEXT_PUBLIC_BACKOFFICE_ORIGIN ?? "";

export function AppShell({ children, current }: { children: ReactNode; current?: "suppliers" }) {
  return (
    <main className="page page-wide">
      <div className="page-header">
        <h1>Supplier Directory</h1>
        <ThemeToggle />
      </div>
      <nav className="nav-links" aria-label="Application menu">
        <a href={`${BACKOFFICE}/backoffice/`}>KPI Dashboard</a>
        <Link href="/suppliers/" aria-current={current === "suppliers" ? "page" : undefined}>
          Supplier Directory
        </Link>
        <a href={`${BACKOFFICE}/backoffice/telemetry.html`}>Telemetry</a>
        <a href={`${BACKOFFICE}/knowledge/`}>Knowledge Assistant</a>
      </nav>
      {children}
    </main>
  );
}
