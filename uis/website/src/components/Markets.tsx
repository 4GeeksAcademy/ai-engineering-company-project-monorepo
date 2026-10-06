import { brand } from "../content/brand";
import "./Markets.css";

const markets = [
  {
    name: "Colombia",
    hub: brand.hq,
    accent: "leaf" as const,
    copy: "Headquarters and the roots of the brand. Company-owned kitchens across the country keep the original Medellín standard.",
  },
  {
    name: "Florida, United States",
    hub: brand.miamiOffice,
    accent: "teal" as const,
    copy: "Commercial and operations office in Miami coordinates Florida locations — same grill standards, second market.",
  },
];

export function Markets() {
  return (
    <section id="markets" className="section markets" aria-labelledby="markets-title">
      <div className="container">
        <p className="section__eyebrow">Two countries · {brand.currencies.join(" & ")}</p>
        <h2 id="markets-title" className="section__title">
          {brand.locations} locations. One standard.
        </h2>
        <p className="section__lead">
          About {brand.employees} people run Brasaland across Colombia and Florida —
          one chain, two labour markets, one plate that should taste the same.
        </p>
        <div className="markets__grid">
          {markets.map((market) => (
            <article
              key={market.name}
              className={`markets__panel markets__panel--${market.accent}`}
            >
              <h3>{market.name}</h3>
              <p className="markets__hub">{market.hub}</p>
              <p>{market.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
