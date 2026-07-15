export function TopNav() {
  return (
    <header className="top-nav">
      <div className="container nav-inner">
        <a href="#inicio" className="brand" aria-label="Brasaland inicio">
          BRASALAND<span>.</span>
        </a>
        <nav className="nav-links" aria-label="Navegacion principal">
          <a href="#menu">Experiencia</a>
          <a href="#locales">Locales</a>
          <a href="#nosotros">Nosotros</a>
          <a href="#rewards">Rewards</a>
        </nav>
        <a className="cta" href="/careers">
          Unete al Equipo
        </a>
      </div>
    </header>
  );
}
