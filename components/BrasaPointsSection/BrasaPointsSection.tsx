import RegistrationForm from "../RegistrationForm";

export default function BrasaPointsSection() {
  return (
    <section
      id="brasa-points"
      aria-labelledby="points-heading"
      className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 md:py-16"
      style={{ contentVisibility: "auto", containIntrinsicSize: "1px 980px" }}
    >
      <h2
        id="points-heading"
        className="font-oswald text-3xl uppercase text-brasa-brown sm:text-4xl"
      >
        Brasa Points
      </h2>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* Info card */}
        <div className="rounded-2xl border border-brasa-brown/10 bg-brasa-cream-light p-6 shadow-sm">
          <ul className="space-y-3 text-sm leading-relaxed text-brasa-text-secondary">
            <li>Earn points with every visit.</li>
            <li>Accumulate 1 point for every $10,000 COP or $5 USD.</li>
            <li>Redeem your points for discounts and free dishes.</li>
            <li>Exclusive offers for members.</li>
            <li>100% digital registration - no more paper cards!</li>
          </ul>
          <p className="mt-6 rounded-xl border border-[#c86a3f]/30 bg-brasa-gold-light p-4 text-sm font-medium text-[#7b2f19]">
            Want to place an order? Call your favorite location or visit us
            directly. Online ordering coming soon!
          </p>
        </div>

        {/* Registration form */}
        <RegistrationForm />
      </div>
    </section>
  );
}
