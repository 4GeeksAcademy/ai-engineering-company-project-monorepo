const COUNTRIES = [
  {
    name: "Colombia",
    detail: "10 restaurants in Medellin, Bogota and Cali",
    hours: "Mon-Sun 11:00 AM - 10:00 PM",
  },
  {
    name: "United States (Florida)",
    detail: "4 restaurants in Miami and Orlando",
    hours: "Mon-Sun 11:00 AM - 10:00 PM",
  },
] as const;

export default function LocationsSection() {
  return (
    <section
      id="locations"
      aria-labelledby="locations-heading"
      className="bg-brasa-brown-dark text-brasa-cream"
      style={{ contentVisibility: "auto", containIntrinsicSize: "1px 520px" }}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 md:py-16">
        <h2
          id="locations-heading"
          className="font-oswald text-3xl uppercase sm:text-4xl"
        >
          Our Locations
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {COUNTRIES.map(({ name, detail, hours }) => (
            <article
              key={name}
              className="rounded-2xl border border-brasa-cream/20 bg-brasa-brown-mid p-6"
            >
              <h3 className="font-oswald text-2xl uppercase text-brasa-gold">
                {name}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-brasa-gold/80">
                {detail}
              </p>
              <p className="mt-2 text-sm font-semibold">{hours}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
