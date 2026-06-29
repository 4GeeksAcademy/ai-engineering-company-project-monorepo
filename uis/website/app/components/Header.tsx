type HeaderProps = {
  ctaHref: string;
};

export function Header({ ctaHref }: HeaderProps) {
  const links = [
    { label: "Inicio", href: "#inicio" },
    { label: "Servicios", href: "#servicios" },
    { label: "Cobertura", href: "#cobertura" },
    { label: "Contacto", href: "#contacto" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="#inicio" className="inline-flex items-center gap-2 text-xl font-semibold tracking-wide text-white">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden="true"></span>
          TrackFlow
        </a>

        <nav aria-label="Navegacion principal" className="hidden md:block">
          <ul className="flex items-center gap-7 text-sm font-medium text-slate-300">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <details className="relative md:hidden">
            <summary className="cursor-pointer list-none rounded-md border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-400 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400">
              Menu
            </summary>
            <ul className="absolute right-0 mt-2 w-48 space-y-1 rounded-md border border-slate-700 bg-slate-900 p-2 text-sm font-medium text-slate-200 shadow-xl">
              {links.map((link) => (
                <li key={`mobile-${link.href}`}>
                  <a href={link.href} className="block rounded px-2 py-2 hover:bg-slate-800">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </details>
          <a
            href={ctaHref}
            className="rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
          >
            Solicitar informacion
          </a>
        </div>
      </div>
    </header>
  );
}
