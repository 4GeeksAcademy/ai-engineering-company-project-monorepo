const navItems = [
  { href: "#promesa", label: "Nuestra Promesa" },
  { href: "#operacion", label: "Operacion" },
  { href: "#digital", label: "Brasaland Digital" },
  { href: "#contacto", label: "Contacto" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          BR
        </span>
        <div>
          <p className="brand-name">Brasaland</p>
          <p className="brand-tag">Parrilla con consistencia</p>
        </div>
      </div>
      <nav>
        <ul>
          {navItems.map((item) => (
            <li key={item.href}>
              <a href={item.href}>{item.label}</a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
