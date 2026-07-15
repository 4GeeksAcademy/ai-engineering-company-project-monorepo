import { Footer } from "@/components/website/Footer";
import { SectionTitle } from "@/components/website/SectionTitle";
import { TopNav } from "@/components/website/TopNav";
import type { LocationItem, MenuItem } from "@/components/website/types";

const menuItems: MenuItem[] = [
  {
    title: "Costillas Signature",
    description:
      "Marinadas 24h, cocidas lentamente y glaseadas con neón-BBQ.",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80",
    accent: "red",
    tag: "#1 VENTAS",
  },
  {
    title: "Smash Brasa",
    description:
      "Doble carne angus sellada a fuego vivo y pan brioche tostado.",
    image:
      "https://images.unsplash.com/photo-1558030006-450675393462?w=1200&q=80",
    accent: "gold",
  },
  {
    title: "Alitas Inferno",
    description:
      "Glaseado de miel ahumada y habanero con cinco niveles de intensidad.",
    image:
      "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=1200&q=80",
    accent: "orange",
    tag: "SPICY",
  },
];

const locations: LocationItem[] = [
  { city: "Medellin - El Poblado", address: "Cra. 37 #8A-29", flag: "🇨🇴" },
  { city: "Miami - Brickell", address: "801 Brickell Ave", flag: "🇺🇸" },
];

export default function Home() {
  return (
    <div id="inicio" className="website-shell">
      <TopNav />
      <main>
        <section className="hero">
          <div className="hero-overlay" />
          <div className="container hero-content">
            <p className="chip">Nueva Generacion a la Brasa</p>
            <h1>
              TRADICION
              <br />
              QUE DEJA
              <br />
              <span>MARCA</span>
            </h1>
            <p>
              De Medellin a Miami. 14 locales, dos paises y una sola obsesion
              por el sabor.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#locales">
                Reservar Mesa
              </a>
              <a className="btn btn-ghost" href="#menu">
                Explorar Menu
              </a>
            </div>
          </div>
        </section>

        <section id="menu" className="section">
          <div className="container">
            <SectionTitle
              eyebrow="Experiencia"
              title="Must Haves"
              subtitle="Platos iconicos que nos definen. Perfeccion al carbon en cada bocado."
            />
            <div className="menu-grid">
              {menuItems.map((item) => (
                <article className="glass-card menu-card" key={item.title}>
                  <div
                    className="menu-image"
                    style={{ backgroundImage: `url(${item.image})` }}
                  >
                    {item.tag ? <span className={`tag ${item.accent}`}>{item.tag}</span> : null}
                  </div>
                  <div className="menu-copy">
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <a href="#">Pedir Ahora</a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="locales" className="section">
          <div className="container">
            <SectionTitle
              eyebrow="Cobertura"
              title="14 Locales"
              subtitle="De Colombia a Florida, misma brasa, misma calidad."
            />
            <div className="locations-grid">
              <article className="glass-card world-card">
                <p>COLOMBIA & FLORIDA</p>
                <small>Encuentra tu punto mas cercano</small>
              </article>
              <div className="location-list">
                {locations.map((location) => (
                  <article className="glass-card location-card" key={location.city}>
                    <div>
                      <h3>{location.city}</h3>
                      <p>{location.address}</p>
                    </div>
                    <span>{location.flag}</span>
                  </article>
                ))}
                <article className="glass-card location-more">
                  <p>+ 12 LOCALES MAS</p>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section id="nosotros" className="section about">
          <div className="container about-grid">
            <article>
              <SectionTitle
                eyebrow="Est. 2008"
                title="El Origen del Fuego"
                subtitle="Comenzamos en Medellin como restaurante familiar. Hoy somos una marca consolidada con operacion binacional."
              />
              <ul className="about-list">
                <li>
                  <strong>01</strong>
                  <div>
                    <h4>Misma Brasa, Dos Paises</h4>
                    <p>La misma experiencia sin importar donde te sientes.</p>
                  </div>
                </li>
                <li>
                  <strong>02</strong>
                  <div>
                    <h4>115 Personas Apasionadas</h4>
                    <p>Equipo enfocado en rapidez, consistencia y hospitalidad.</p>
                  </div>
                </li>
              </ul>
            </article>
            <article className="about-collage">
              <div className="img a" />
              <div className="img b" />
              <div className="img c" />
              <div className="img d" />
            </article>
          </div>
        </section>

        <section id="rewards" className="section rewards">
          <div className="container rewards-shell">
            <article>
              <SectionTitle
                eyebrow="Lealtad 2.0"
                title="Brasa Rewards"
                subtitle="Acumula puntos en cada visita y desbloquea beneficios personalizados."
              />
              <div className="reward-kpis">
                <div className="glass-card">
                  <p>2X</p>
                  <span>en pedidos online</span>
                </div>
                <div className="glass-card">
                  <p>500</p>
                  <span>puntos al unirte</span>
                </div>
              </div>
              <a className="btn btn-primary" href="/careers">
                Descargar App
              </a>
            </article>
            <aside className="glass-card rewards-card">
              <div>
                <p>Total puntos</p>
                <h3>3,450</h3>
              </div>
              <div className="rewards-status">
                <span>Nivel Fuego</span>
                <small>Activo</small>
              </div>
              <div className="rewards-status muted">
                <span>Cena VIP</span>
                <small>A 550 pts</small>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
