import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-[#121721]/85 backdrop-blur-xl border-b border-emerald-500/20 text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Department */}
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-extrabold text-lg text-[#0a0d12] shadow-[0_0_15px_rgba(16,185,129,0.35)]">
              N
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white block leading-none">
                Nexova <span className="text-emerald-400">Solutions</span>
              </span>
              <span className="text-xs text-amber-200/80 font-medium block mt-0.5">
                Operaciones de Selección &amp; Talento
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Actions */}
        <nav className="flex items-center space-x-4">
          <Link
            href="/"
            className="text-sm font-semibold text-emerald-100/80 hover:text-white px-3.5 py-2 rounded-xl hover:bg-emerald-500/10 transition-colors"
          >
            Candidaturas
          </Link>
          <Link
            href="/candidates/new"
            className="inline-flex items-center text-sm font-bold bg-emerald-400 hover:bg-emerald-300 text-[#0a0d12] px-4 py-2 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all"
          >
            <svg
              className="w-4 h-4 mr-1.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Nueva Candidatura
          </Link>
        </nav>
      </div>
    </header>
  );
}
