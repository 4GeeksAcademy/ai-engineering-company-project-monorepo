import { brand } from "../content/brand";
import "./Hero.css";

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-brand">
      <div className="hero__atmosphere" aria-hidden="true">
        <div className="hero__glow" />
        <div className="hero__grill" />
      </div>
      <div className="container hero__content">
        <p className="hero__kicker">
          Since {brand.founded} · {brand.markets.join(" + ")}
        </p>
        <h1 id="hero-brand" className="hero__brand">
          {brand.name}
        </h1>
        <p className="hero__tagline">{brand.tagline}</p>
        <div className="btn-row hero__actions">
          <a className="btn btn--primary" href="#markets">
            Explore {brand.locations} locations
          </a>
          <a className="btn btn--ghost" href="#brasa-points">
            Learn about {brand.loyalty.name}
          </a>
        </div>
      </div>
    </section>
  );
}
