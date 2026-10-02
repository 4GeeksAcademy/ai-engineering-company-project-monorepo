const LINKS = [
  { label: "hello@brasaland.com", href: "mailto:hello@brasaland.com" },
  { label: "+57 4 123 4567", href: "tel:+5741234567" },
  { label: "+1 305 123 4567", href: "tel:+13051234567" },
] as const;

export default function ContactSection() {
  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="bg-brasa-brown-dark text-brasa-cream"
      style={{ contentVisibility: "auto", containIntrinsicSize: "1px 300px" }}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 md:py-16">
        <h2
          id="contact-heading"
          className="font-oswald text-3xl uppercase sm:text-4xl"
        >
          Contact
        </h2>
        <address className="mt-5 not-italic space-y-2 text-base text-brasa-gold/80">
          <p>
            Email:{" "}
            <a
              href={LINKS[0].href}
              className="font-semibold text-brasa-gold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brasa-gold"
            >
              {LINKS[0].label}
            </a>
          </p>
          <p>
            Colombia:{" "}
            <a
              href={LINKS[1].href}
              className="font-semibold text-brasa-gold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brasa-gold"
            >
              {LINKS[1].label}
            </a>
          </p>
          <p>
            Florida:{" "}
            <a
              href={LINKS[2].href}
              className="font-semibold text-brasa-gold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brasa-gold"
            >
              {LINKS[2].label}
            </a>
          </p>
        </address>
      </div>
    </section>
  );
}
