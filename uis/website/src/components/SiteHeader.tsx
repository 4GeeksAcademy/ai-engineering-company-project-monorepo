import { Link } from "react-router-dom";
import { brand } from "../content/brand";
import "./SiteHeader.css";

const links = [
  { href: "#commitments", label: "Our promise" },
  { href: "#markets", label: "Locations" },
  { href: "#brasa-points", label: "Brasa Points" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link to="/" className="site-header__brand" aria-label={`${brand.name} home`}>
          <span className="site-header__mark" aria-hidden="true" />
          <span className="site-header__name">{brand.name}</span>
        </Link>
        <nav className="site-header__nav" aria-label="Primary">
          {links.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <a className="btn btn--primary site-header__cta" href="#markets">
          Find a location
        </a>
      </div>
    </header>
  );
}
