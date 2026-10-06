import { Link } from "react-router-dom";
import { brand } from "../content/brand";
import "./SiteFooter.css";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div>
          <Link to="/" className="site-footer__brand">
            {brand.name}
          </Link>
          <p>
            Led by {brand.ceo}. Built for guests in Colombia and Florida —
            same grill, two markets.
          </p>
        </div>
        <p className="site-footer__meta">
          HQ {brand.hq} · Office {brand.miamiOffice}
        </p>
      </div>
    </footer>
  );
}
