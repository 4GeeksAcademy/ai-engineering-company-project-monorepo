type HeroProps = {
  ctaHref: string;
};

export function Hero({ ctaHref }: HeroProps) {
  return (
    <section id="inicio" className="relative isolate overflow-hidden border-b border-slate-800">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950"></div>
      <div className="absolute -left-20 top-20 -z-10 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl"></div>
      <div className="absolute -right-24 bottom-0 -z-10 h-80 w-80 rounded-full bg-amber-400/20 blur-3xl"></div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-24">
        <div>
          <p className="mb-4 inline-flex rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
            3PL Binacional
          </p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
            Logistica que escala con tu e-commerce
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Gestion de almacenes, entregas de ultima milla y logistica inversa en Estados Unidos y Espana. Mas de 15 anos ayudando a marcas de moda, electronica y cosmetica a crecer sin preocuparse por la operacion.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href={ctaHref}
              className="rounded-md bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
            >
              Solicitar informacion
            </a>
          </div>
        </div>

        <figure className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-cyan-900/30">
          <img
            src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1400&q=80"
            alt="Centro logistico moderno con bandas de picking y cajas preparadas para ultima milla"
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </figure>
      </div>
    </section>
  );
}
