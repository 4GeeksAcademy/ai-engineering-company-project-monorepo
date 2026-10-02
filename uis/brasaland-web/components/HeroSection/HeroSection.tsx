export default function HeroSection() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="w-full min-h-screen"
    >
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-4 py-14 sm:px-6 md:grid-cols-[1.3fr_1fr] md:py-20">
        {/* Copy side */}
        <div>
          <span className="inline-block rounded-full bg-brasa-red-deep px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-brasa-cream">
            Since 2008
          </span>
          <h1
            id="hero-heading"
            className="mt-5 font-oswald text-4xl uppercase leading-[1.05] text-brasa-brown sm:text-5xl md:text-6xl"
          >
            The taste of the grill, in every bite
          </h1>
          <p className="mt-5 max-w-[60ch] text-lg leading-relaxed text-brasa-text-secondary">
            Since 2008 serving the best grilled meats in Colombia and the
            United States. 14 locations, one passion for quality and flavor.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#brasa-points-form"
              className="rounded-full bg-brasa-red px-6 py-3 text-sm font-bold uppercase tracking-wide text-brasa-cream shadow-[0_10px_25px_rgba(109,36,20,0.3)] transition hover:-translate-y-0.5 hover:bg-brasa-red-dark"
            >
              Join Brasa Points
            </a>
            <span
              id="menu"
              className="rounded-full border border-brasa-text-secondary/20 bg-brasa-cream-light px-4 py-2 text-sm text-brasa-text-secondary"
            >
              Menu crafted around premium grilled cuts and Colombian flavors.
            </span>
          </div>
        </div>

        {/* Brand promise card */}
        <div className="relative overflow-hidden rounded-3xl border border-brasa-border/10 bg-brasa-brown p-6 text-brasa-cream shadow-2xl">
          <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-brasa-orange/40 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-brasa-gold/25 blur-xl" />
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brasa-gold">
            Brand Promise
          </p>
          <ul className="mt-4 space-y-4 text-sm leading-relaxed">
            <li>Consistent product quality in every location.</li>
            <li>Warm and reliable customer experience.</li>
            <li>Fast service without sacrificing flavor.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
