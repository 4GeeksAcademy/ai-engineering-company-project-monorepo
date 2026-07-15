import Link from "next/link";
import { COMPANY_NAME, DEPARTMENT_NAME } from "@/lib/constants";

export default function Header() {
  return (
    <header className="border-b border-orange-200 bg-gradient-to-r from-orange-950 to-red-900 text-white shadow-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div>
          <Link href="/" className="group block">
            <p className="text-xs font-medium uppercase tracking-widest text-orange-200">
              {COMPANY_NAME}
            </p>
            <h1 className="text-lg font-bold group-hover:text-orange-100 sm:text-xl">
              {DEPARTMENT_NAME}
            </h1>
            <p className="text-sm text-orange-100/80">
              Pipeline de candidaturas
            </p>
          </Link>
        </div>
        <nav className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-sm font-medium text-orange-50 transition hover:bg-white/10"
          >
            Candidaturas
          </Link>
          <Link
            href="/candidates/new"
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-orange-400"
          >
            Nueva candidatura
          </Link>
        </nav>
      </div>
    </header>
  );
}
