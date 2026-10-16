import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Department */}
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-lg text-white shadow-sm group-hover:bg-blue-500 transition-colors">
              N
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white block leading-none">
                Nexova <span className="text-blue-400">Solutions</span>
              </span>
              <span className="text-xs text-slate-400 font-medium block mt-0.5">
                Operaciones de Selección & Talento
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Actions */}
        <nav className="flex items-center space-x-4">
          <Link
            href="/"
            className="text-sm font-medium text-slate-300 hover:text-white px-3 py-2 rounded-md hover:bg-slate-800 transition-colors"
          >
            Candidaturas
          </Link>
          <Link
            href="/candidates/new"
            className="inline-flex items-center text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg shadow-sm transition-colors"
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
