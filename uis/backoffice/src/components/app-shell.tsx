"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeartPulse, LayoutDashboard, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Operations overview", icon: LayoutDashboard },
  { href: "/suppliers", label: "Supplier directory", icon: Truck },
];

const TITLES: Record<string, string> = {
  "/": "Operations overview",
  "/suppliers": "Supplier directory",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-full bg-background text-foreground">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="border-b border-border bg-sidebar lg:w-64 lg:border-r lg:border-b-0">
          <div className="flex items-center gap-3 px-5 py-5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HeartPulse className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">HealthCore</p>
              <p className="text-xs text-muted-foreground">Patient Experience backoffice</p>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-6">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-w-fit items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-8">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                HealthCore
              </p>
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
                {TITLES[pathname] ??
                  (pathname.startsWith("/suppliers")
                    ? "Supplier directory"
                    : "Operations overview")}
              </h1>
            </div>
          </header>
          <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
