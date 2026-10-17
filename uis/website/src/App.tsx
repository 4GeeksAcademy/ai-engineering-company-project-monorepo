import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import Hero from "./Hero";
import { CheckItem, SectionHeading, TextLink } from "./components";
import { CONTACT } from "./content";
import { TALENT_PATH, Link, currentPath } from "./router";
import TalentForm from "./TalentForm";

const schema = { "@context": "https://schema.org", "@type": "Organization", name: "Nexova", description: "Consultora de recursos humanos y adquisición de talento", url: "https://nexova.com", foundingDate: "2011", address: [{ "@type": "PostalAddress", addressCountry: "ES", addressLocality: "Valencia", addressRegion: "Comunidad Valenciana" }, { "@type": "PostalAddress", addressCountry: "US", addressLocality: "Miami", addressRegion: "Florida" }], contactPoint: { "@type": "ContactPoint", telephone: "+34-960-123-456", contactType: "customer service", availableLanguage: ["Spanish", "English"] }, sameAs: ["https://linkedin.com/company/nexova", "https://instagram.com/nexova"] };

const services = [["Headhunting Ejecutivo", ["Búsqueda y selección de perfiles ejecutivos y mandos medios", "Proceso personalizado con garantía de reemplazo"]], ["Outsourcing de Atención al Cliente", ["Equipos especializados para empresas tecnológicas", "Formación continua y supervisión dedicada"]], ["Formación Corporativa", ["Programas de soft skills y liderazgo", "Cursos presenciales y en línea adaptados a cada organización"]]] as const;

const reasons = [
  "12 años de experiencia en el mercado latinoamericano",
  "Presencia regional: España y Estados Unidos",
  "+500 procesos exitosos de selección completados",
  "Especialización sectorial en tecnología, retail y finanzas",
];

export default function App() {
  const [menu, setMenu] = useState(false);
  const [path, setPath] = useState(currentPath);
  const sync = () => {
    setPath(currentPath());
    setMenu(false);
  };
  useEffect(() => {
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  // Tras navegar, baja a la sección del hash (o al inicio si no hay).
  useEffect(() => {
    const id = window.location.hash.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [path]);
  const nav = (to: string, label: string) => (
    <Link to={to} onNavigate={sync}>
      {label}
    </Link>
  );
  const onTalent = path === TALENT_PATH;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <header className="border-b border-slate-800 bg-slate-950/90">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5" aria-label="Navegación principal">
          <Link to="/" onNavigate={sync} className="text-2xl font-black tracking-tight text-white">
            nexova<span className="text-cyan-400">.</span>
          </Link>
          <button className="text-white md:hidden" onClick={() => setMenu(!menu)} aria-label="Abrir menú" aria-expanded={menu}>
            {menu ? <X /> : <Menu />}
          </button>
          <div className={`${menu ? "flex" : "hidden"} absolute left-0 top-16 z-10 w-full flex-col gap-5 bg-slate-950 p-6 md:static md:flex md:w-auto md:flex-row md:bg-transparent`}>
            {nav("/", "Inicio")}
            {nav("/#servicios", "Servicios")}
            {nav(TALENT_PATH, "Talento")}
            {nav("/#contacto", "Contacto")}
          </div>
        </nav>
      </header>
      <main>
        {onTalent ? (
          <section id="talento" className="px-6 py-24">
            <div className="mx-auto max-w-4xl">
              <SectionHeading as="h1" eyebrow="Tu próximo paso" title="Únete a nuestro banco de talento" />
              <p className="mt-4 text-slate-300">
                Este formulario es para profesionales. ¿Eres una empresa buscando talento? Escríbenos a{" "}
                <TextLink href={`mailto:${CONTACT.email}`}>{CONTACT.email}</TextLink>
              </p>
              <div className="mt-10">
                {/* Not lazy-loaded: measured on /talento, a separate chunk adds a request after the main script
                    (LCP 1423 -> 1672 ms) to save 0.7 KB gzip on the home page. See docs/performance/REPORT.md. */}
                <TalentForm />
              </div>
            </div>
          </section>
        ) : (
          <>
            <Hero onNavigate={sync} />
            <section id="servicios" className="bg-slate-900/70 px-6 py-24">
              <div className="mx-auto max-w-6xl">
                <SectionHeading eyebrow="Lo que hacemos" title="Soluciones para hacer crecer tu organización" />
                <div className="mt-12 grid gap-6 md:grid-cols-3">
                  {services.map(([title, points]) => (
                    <article key={title} className="rounded-2xl border border-slate-800 bg-slate-950 p-7">
                      <h3 className="text-xl font-bold text-white">{title}</h3>
                      <ul className="mt-4 space-y-3 leading-relaxed text-slate-400">
                        {points.map((point) => (
                          <CheckItem key={point} compact>
                            {point}
                          </CheckItem>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </div>
            </section>
            <section className="mx-auto grid max-w-6xl gap-12 px-6 py-24 md:grid-cols-2">
              <div>
                <SectionHeading eyebrow="Por qué Nexova" title="Experiencia que se nota en cada conexión" />
              </div>
              <ul className="grid gap-5 text-lg text-slate-300">
                {reasons.map((item) => (
                  <CheckItem key={item}>{item}</CheckItem>
                ))}
              </ul>
            </section>
            <section id="contacto" className="bg-slate-900/70 px-6 py-24">
              <div className="mx-auto max-w-6xl">
                <SectionHeading eyebrow="Contacto" title="Hablemos" />
                <ul className="mt-8 space-y-3 text-lg text-slate-300">
                  <li>
                    Email: <TextLink href={`mailto:${CONTACT.email}`}>{CONTACT.email}</TextLink>
                  </li>
                  {CONTACT.phones.map((phone) => (
                    <li key={phone.city}>
                      {phone.city}: <TextLink href={phone.href}>{phone.display}</TextLink>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </>
        )}
      </main>
      <footer className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="text-2xl font-black text-white">
              nexova<span className="text-cyan-400">.</span>
            </p>
            <p className="mt-3 text-slate-400">© 2025 Nexova. Todos los derechos reservados.</p>
          </div>
          <div className="text-slate-300">
            <p>{CONTACT.email}</p>
            {CONTACT.phones.map((phone) => (
              <p key={phone.city} className="mt-2">
                {phone.city}: {phone.display}
              </p>
            ))}
          </div>
          <div className="flex gap-4">
            <a href="https://linkedin.com/company/nexova" aria-label="LinkedIn">
              LinkedIn
            </a>
            <a href="https://instagram.com/nexova" aria-label="Instagram">
              Instagram
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
