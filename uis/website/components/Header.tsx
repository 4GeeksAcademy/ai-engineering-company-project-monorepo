import { NAV_LINKS } from "@trackflow-content";

type HeaderProps = {
  applicationHref?: string;
};

export function Header({
  applicationHref = "/application.html",
}: HeaderProps) {
  return (
    <header className="site-header" id="top">
      <div className="container header-inner">
        <a className="brand" href="#top" aria-label="TrackFlow home">
          <span className="brand-mark" aria-hidden="true">
            TF
          </span>
          <span>Track Flow</span>
        </a>

        <nav aria-label="Primary navigation">
          <ul className="nav-links">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <a href={link.label === "Apply" ? applicationHref : link.href}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
