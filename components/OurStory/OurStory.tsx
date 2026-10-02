export default function OurStory() {
  return (
    <section
      aria-labelledby="story-heading"
      className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 md:py-16"
      style={{ contentVisibility: "auto", containIntrinsicSize: "1px 700px" }}
    >
      <div>
        <h2
          id="story-heading"
          className="font-oswald text-3xl uppercase text-brasa-brown sm:text-4xl"
        >
          Our Story
        </h2>
        <p className="mt-5 text-base leading-relaxed text-brasa-text-secondary">
          Founded in Medellin in 2008, Brasaland began as a family dream:
          sharing the authentic taste of grilled meat with consistent quality
          and warm service. Today we are 14 restaurants in two countries, but
          we maintain the same recipe for success: fresh products, traditional
          techniques, and passion for every dish we serve.
        </p>
      </div>
      <figure className="overflow-hidden rounded-3xl border border-brasa-border/10 bg-brasa-cream-light p-3 shadow-lg">
        <img
          src="https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1200&q=80"
          alt="Brasaland grilled meats served on a wooden table"
          loading="lazy"
          decoding="async"
          width={1200}
          height={800}
          className="h-full min-h-[240px] w-full rounded-2xl object-cover"
        />
      </figure>
    </section>
  );
}
