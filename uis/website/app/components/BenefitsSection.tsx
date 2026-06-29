type Benefit = {
  title: string;
  description: string;
};

type BenefitsSectionProps = {
  benefits: Benefit[];
};

export function BenefitsSection({ benefits }: BenefitsSectionProps) {
  return (
    <section id="porque-trackflow" className="border-y border-slate-800 bg-slate-900/50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-20">
        <div>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Por que TrackFlow</h2>
          <p className="mt-4 text-slate-300">
            TrackFlow combina infraestructura, talento y tecnologia para escalar tu operacion e-commerce.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {benefits.map((benefit) => (
            <article key={benefit.title} className="rounded-xl border border-slate-700 bg-slate-950/70 p-5">
              <p className="text-sm font-semibold text-amber-300">{benefit.title}</p>
              <p className="mt-2 text-sm text-slate-300">{benefit.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
