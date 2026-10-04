import { KpiStrip } from "@/components/KpiStrip";
import { SectionTitle } from "@/components/SectionTitle";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const promises = [
  {
    title: "Sabor consistente",
    description:
      "Estandares de cocina comunes para que cada plato mantenga identidad en cualquier local.",
  },
  {
    title: "Servicio calido",
    description:
      "Equipos entrenados para ofrecer una experiencia humana y cercana en sala, pickup y delivery.",
  },
  {
    title: "Operacion rapida",
    description:
      "Procesos operativos que priorizan tiempos de preparacion cortos sin comprometer calidad.",
  },
];

const operatingNeeds = [
  "Dashboard de ventas en tiempo real por local (COP/USD)",
  "Alertas de locales abiertos sin ventas",
  "Gestion inteligente de pedidos por historico y stock",
  "Vision consolidada de proveedores Colombia + Florida",
];

const digitalTracks = [
  {
    title: "Website y experiencia publica",
    text: "Nueva experiencia web para presentar la marca, facilitar discovery y soportar crecimiento digital.",
  },
  {
    title: "Backoffice operativo",
    text: "Aplicacion interna para operaciones, compras, RRHH y direccion ejecutiva con enfoque data-driven.",
  },
  {
    title: "Base IA progresiva",
    text: "Prediccion de demanda, personalizacion de menu, deteccion de anomalias y asistentes internos.",
  },
];

export default function Home() {
  return (
    <div className="website-shell">
      <SiteHeader />

      <main>
        <section id="que-hacemos" className="hero" aria-labelledby="hero-title">
          <p className="eyebrow">Cadena de restaurantes a la brasa</p>
          <h1 id="hero-title">
            Brasaland: 14 locales, dos paises y una promesa de consistencia.
          </h1>
          <p>
            Desde Medellin hasta Florida, construimos una experiencia de parrilla
            con sabor estable, servicio cercano y operacion rapida.
          </p>
          <div className="hero-cta">
            <a href="/aplicar" className="btn btn-solid">
              Unete a nuestro equipo
            </a>
            <a href="#caracteristicas" className="btn btn-outline">
              Ver beneficios
            </a>
          </div>
        </section>

        <KpiStrip />

        <section id="caracteristicas" className="section">
          <SectionTitle
            eyebrow="Identidad"
            title="Tres promesas que sostienen la marca"
            subtitle="Escalamos la operacion cuidando producto y experiencia en cada local."
          />
          <div className="cards three">
            {promises.map((item) => (
              <article key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="operacion" className="section">
          <SectionTitle
            eyebrow="Operacion"
            title="Retos reales que estamos resolviendo"
            subtitle="Unificamos ventas, stock, proveedores y decisiones con datos de tiempo cercano al real."
          />
          <div className="cards two">
            <article>
              <h3>Necesidades prioritarias</h3>
              <ul>
                {operatingNeeds.map((need) => (
                  <li key={need}>{need}</li>
                ))}
              </ul>
            </article>
            <article>
              <h3>Preguntas de negocio clave</h3>
              <ul>
                <li>Cuanto vendimos esta semana en Florida vs Colombia?</li>
                <li>Que local tiene el ticket promedio mas alto del mes?</li>
                <li>Donde hay riesgo de rotura de stock esta semana?</li>
                <li>Que proveedores incrementan precios por categoria?</li>
              </ul>
            </article>
          </div>
        </section>

        <section id="digital" className="section">
          <SectionTitle
            eyebrow="Brasaland Digital"
            title="Un monorepo para escalar producto, datos e IA"
            subtitle="La base tecnica evoluciona con website, backoffice, API central y automatizaciones."
          />
          <div className="cards three">
            {digitalTracks.map((track) => (
              <article key={track.title}>
                <h3>{track.title}</h3>
                <p>{track.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="contacto" className="contact-cta section">
          <div>
            <h3>Listo para vivir la experiencia Brasaland?</h3>
            <p>Contactanos o aplica para ser parte de nuestro equipo.</p>
            <a href="mailto:contacto@brasaland.com">contacto@brasaland.com</a>
          </div>
          <a href="/aplicar" className="btn btn-solid">
            Aplicar ahora
          </a>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
