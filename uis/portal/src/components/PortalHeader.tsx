import Link from "next/link";

export function PortalHeader() {
  return (
    <header className="portal-header">
      <div className="container portal-header__inner">
        <Link href="/" className="portal-header__brand" aria-label="Brasaland portal home">
          <span className="portal-header__mark" aria-hidden="true" />
          <span className="portal-header__name">Brasaland</span>
        </Link>
        <nav className="portal-header__nav" aria-label="Portal">
          <Link href="/points">Brasa Points</Link>
          <Link href="/ops/sales">Sales</Link>
        </nav>
      </div>
    </header>
  );
}
