const FEATURES = [
  {
    title: "Consistent Quality",
    items: [
      "Same recipes and standards in all locations.",
      "Fresh ingredients selected daily.",
    ],
  },
  {
    title: "Warm Experience",
    items: [
      "Friendly and attentive service.",
      "Family atmosphere on every visit.",
    ],
  },
  {
    title: "Speed",
    items: [
      "Your food ready in minutes.",
      "Without sacrificing flavor or quality.",
    ],
  },
] as const;

export default function UniqueSection() {
  return (
    <section
      aria-labelledby="unique-heading"
      className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 md:py-16"
      style={{ contentVisibility: "auto", containIntrinsicSize: "1px 680px" }}
    >
      <h2
        id="unique-heading"
        className="font-oswald text-3xl uppercase text-brasa-brown sm:text-4xl"
      >
        What Makes Us Unique
      </h2>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {FEATURES.map(({ title, items }) => (
          <article
            key={title}
            className="rounded-2xl border border-brasa-brown/10 bg-brasa-cream-light p-6 shadow-sm"
          >
            <h3 className="font-oswald text-2xl uppercase text-brasa-brown">
              {title}
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-brasa-text-secondary">
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
