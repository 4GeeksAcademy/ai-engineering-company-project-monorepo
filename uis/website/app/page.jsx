const locations = ["Medellin", "Florida", "14 restaurantes"];

export default function HomePage() {
  return (
    <main>
      <section className="hero" aria-labelledby="brand-name">
        <picture className="heroPicture">
          <source
            media="(max-width: 700px)"
            srcSet="/brasa-hero-800.webp"
          />
          <img
            className="heroImage"
            src="/brasa-hero-1600.webp"
            width="1600"
            height="1068"
            alt="Plato de carnes y vegetales preparados a la brasa"
            fetchPriority="high"
            loading="eager"
            decoding="sync"
          />
        </picture>
        <div className="heroShade" />
        <header className="siteHeader">
          <a className="wordmark" href="#inicio" aria-label="Brasaland, inicio">
            BRASALAND<span>.</span>
          </a>
          <nav aria-label="Navegacion principal">
            <a href="#cocina">Nuestra cocina</a>
            <a href="#sedes">Sedes</a>
          </nav>
        </header>
        <div className="heroCopy" id="inicio">
          <p className="eyebrow">Medellin · Desde 2008</p>
          <h1 id="brand-name">Brasaland</h1>
          <p className="heroLead">
            El fuego lento, la mesa larga y el gusto de volver a encontrarnos.
          </p>
          <a className="heroLink" href="#cocina">Conoce nuestra cocina</a>
        </div>
        <p className="heroNote">Cocina honesta, hecha al fuego.</p>
      </section>

      <section className="intro" id="cocina">
        <div>
          <p className="eyebrow introEyebrow">Una casa para compartir</p>
          <h2>El sabor empieza en la brasa.</h2>
        </div>
        <p className="introText">
          Desde Medellin llevamos nuestra cocina a la brasa a cada mesa:
          ingredientes frescos, tiempo y hospitalidad sin ceremonia.
        </p>
      </section>

      <section className="locations" id="sedes" aria-label="Nuestras sedes">
        {locations.map((location) => (
          <p key={location}>{location}</p>
        ))}
      </section>
    </main>
  );
}