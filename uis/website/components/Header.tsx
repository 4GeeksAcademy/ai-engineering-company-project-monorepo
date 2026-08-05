export default function Header() {
  return (
    <header className="sticky top-0 z-20 w-full border-b border-orange-200 bg-orange-50/90 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span className="text-xl font-bold tracking-tight sm:text-2xl">Nexova</span>
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-orange-900 sm:justify-end sm:space-x-6 sm:text-base md:text-lg">
          <li>
            <a href="#home" className="nav-link hover:text-rose-600">
              Home
            </a>
          </li>
          <li>
            <a href="#services" className="nav-link hover:text-rose-600">
              Services
            </a>
          </li>
          <li>
            <a href="#why" className="nav-link hover:text-rose-600">
              Talent
            </a>
          </li>
          <li>
            <a href="#contact" className="nav-link hover:text-rose-600">
              Contact
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
