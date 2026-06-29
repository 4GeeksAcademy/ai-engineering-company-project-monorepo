type Service = {
  title: string;
  bullets: string[];
};

type ServicesSectionProps = {
  services: Service[];
};

export function ServicesSection({ services }: ServicesSectionProps) {
  return (
    <section id="servicios" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
      <div className="mb-10 max-w-3xl">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">Servicios</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {services.map((service) => (
          <article key={service.title} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h3 className="text-xl font-semibold text-cyan-200">{service.title}</h3>
            <ul className="mt-5 space-y-2 text-sm text-slate-300">
              {service.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
