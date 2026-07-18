type CoverageItem = {
  title: string;
  bullets: string[];
};

type CoverageSectionProps = {
  regions: CoverageItem[];
};

export function CoverageSection({ regions }: CoverageSectionProps) {
  return (
    <section id="cobertura" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
      <h2 className="text-3xl font-bold text-white sm:text-4xl">Cobertura</h2>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {regions.map((region) => (
          <article key={region.title} className="rounded-xl border border-slate-800 bg-slate-900/70 p-6">
            <h3 className="text-xl font-semibold text-cyan-200">{region.title}</h3>
            <ul className="mt-5 space-y-2 text-sm text-slate-300">
              {region.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
