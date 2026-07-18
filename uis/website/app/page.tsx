import { BenefitsSection } from "./components/BenefitsSection";
import { ContactForm } from "./components/ContactForm";
import { ContactSection } from "./components/ContactSection";
import { CoverageSection } from "./components/CoverageSection";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { ServicesSection } from "./components/ServicesSection";

const services = [
  {
    title: "Gestión de Almacenes",
    bullets: [
      "Almacenamiento, picking y packing",
      "Inventario en tiempo real",
      "Operamos almacenes en Los Ángeles y Zaragoza",
    ],
  },
  {
    title: "Entregas de Última Milla",
    bullets: [
      "Red de carriers certificados en ambos países",
      "Seguimiento unificado de envíos",
      "Gestión de incidencias y devoluciones",
    ],
  },
  {
    title: "Logística Inversa",
    bullets: [
      "Gestión completa de devoluciones",
      "Inspección y reacondicionamiento",
      "Integración con tu plataforma de ventas",
    ],
  },
];

const coverage = [
  {
    title: "Estados Unidos",
    bullets: ["Almacén en Los Ángeles", "Cobertura nacional", "Carriers: UPS, FedEx, DHL"],
  },
  {
    title: "España",
    bullets: ["Almacén en Zaragoza", "Cobertura peninsular e islas", "Carriers: MRW, SEUR, DHL"],
  },
];

const benefits = [
  {
    title: "Operación binacional",
    description: "El único operador con infraestructura propia en Estados Unidos y España",
  },
  { title: "+130 profesionales", description: "Dedicados a tu logística" },
  { title: "Tecnología propia", description: "Para visibilidad total de tu inventario" },
  {
    title: "Especialización e-commerce",
    description: "En moda, electrónica y cosmética",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-amber-400 focus:px-4 focus:py-2 focus:text-slate-950"
      >
        Saltar al contenido principal
      </a>

      <Header ctaHref="#solicitud" />

      <main id="contenido-principal">
        <Hero ctaHref="#solicitud" />
        <ServicesSection services={services} />
        <CoverageSection regions={coverage} />
        <BenefitsSection benefits={benefits} />
        <ContactSection
          email="comercial@trackflow.com"
          phoneUs="+1 213 555 0147"
          phoneEs="+34 976 123 456"
        />

        <section id="solicitud">
          <ContactForm />
        </section>
      </main>

      <Footer />
    </div>
  );
}
