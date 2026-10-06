import { brand } from "../content/brand";
import "./BrandPillars.css";

export function BrandPillars() {
  return (
    <section id="commitments" className="section pillars" aria-labelledby="pillars-title">
      <div className="container">
        <p className="section__eyebrow">What we stand for</p>
        <h2 id="pillars-title" className="section__title">
          Three commitments in every kitchen
        </h2>
        <p className="section__lead">
          From a single family grill in Medellín to {brand.locations} company-owned
          restaurants, Brasaland still runs on the same three promises.
        </p>
        <ul className="pillars__grid">
          {brand.commitments.map((item) => (
            <li key={item.title} className="pillars__card">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
