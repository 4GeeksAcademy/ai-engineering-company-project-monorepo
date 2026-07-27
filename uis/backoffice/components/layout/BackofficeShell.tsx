import Link from "next/link";

export function BackofficeShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">HealthCore Digital</p>
            <h1 className="text-lg font-semibold">Operations Backoffice</h1>
          </div>
          <nav className="text-sm text-slate-300" aria-label="Backoffice navigation">
            <Link href="/" className="font-medium text-white hover:underline">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
