import { brand } from "../content/brand";
import "./LoyaltyTeaser.css";

export function LoyaltyTeaser() {
  return (
    <section
      id="brasa-points"
      className="section loyalty"
      aria-labelledby="loyalty-title"
    >
      <div className="container loyalty__inner">
        <div>
          <p className="section__eyebrow">Loyalty</p>
          <h2 id="loyalty-title" className="section__title">
            {brand.loyalty.name}
          </h2>
          <p className="section__lead">{brand.loyalty.status}</p>
        </div>
        <aside className="loyalty__note" aria-label="Programme status">
          <p className="loyalty__label">Guest programme</p>
          <p className="loyalty__name">{brand.loyalty.name}</p>
          <p>
            Physical stamp cards still define today’s experience. Digital ordering
            and a customer CRM are on the Brasaland Digital roadmap for Marketing.
          </p>
        </aside>
      </div>
    </section>
  );
}
