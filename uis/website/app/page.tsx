import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 scroll-smooth">
      {/* Header / Nav */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold tracking-tight text-blue-950">
            Nexova Solutions
          </Link>
          <ul className="flex items-center gap-4 sm:gap-6 text-sm font-medium text-slate-700">
            <li><a href="#servicios" className="hover:text-blue-700 transition">Servicios</a></li>
            <li><a href="#impacto" className="hover:text-blue-700 transition">Impacto</a></li>
            <li><a href="#experiencia" className="hover:text-blue-700 transition">Experiencia</a></li>
            <li>
              <a 
                href="/uis/nexova/operaciones-seleccion/nexova-departamentos-panel.html" 
                className="inline-flex items-center justify-center rounded-lg bg-blue-900 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-800 transition"
              >
                Acceso Consultores (Backoffice)
              </a>
            </li>
          </ul>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="border-b border-slate-200 bg-white py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl space-y-6">
              <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-blue-900">
                Consultora de Reclutamiento & RRHH — Valencia | Miami
              </span>
              <h1 className="text-4xl font-extrabold tracking-tight text-blue-950 sm:text-5xl lg:text-6xl">
                Transformación Digital y Selección de Talento Impulsada por IA
              </h1>
              <p className="text-lg leading-8 text-slate-600">
                En Nexova combinamos más de una década de experiencia en adquisición de talento con la potencia del procesamiento automatizado e IA para agilizar los procesos de reclutamiento ejecutivo, outsourcing y formación corporativa.
              </p>
              <div className="flex gap-4 pt-2">
                <a href="#servicios" className="rounded-md bg-blue-900 px-6 py-3 font-semibold text-white shadow-sm hover:bg-blue-800 transition">
                  Explorar Servicios
                </a>
                <a href="#contacto" className="rounded-md border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition">
                  Contactar Equipo
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Servicios Section */}
        <section id="servicios" className="py-16 sm:py-24 border-b border-slate-200 scroll-mt-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl font-bold text-blue-950">Nuestras Líneas de Negocio</h2>
              <p className="mt-3 text-slate-600">Soluciones integrales diseñadas para la gestión estratégica del capital humano.</p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
                <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center font-bold mb-4">01</div>
                <h3 className="text-xl font-bold text-blue-950 mb-2">Headhunting Ejecutivo</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Búsqueda y evaluación especializada de directivos y perfiles técnicos clave para empresas tecnológicas y corporaciones.
                </p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
                <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center font-bold mb-4">02</div>
                <h3 className="text-xl font-bold text-blue-950 mb-2">Outsourcing de Equipos</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Provisión e integración de equipos completos de soporte técnico y atención al cliente para startups y scale-ups.
                </p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
                <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center font-bold mb-4">03</div>
                <h3 className="text-xl font-bold text-blue-950 mb-2">Formación Corporativa</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Programas de capacitación técnica y desarrollo de competencias digitales para optimizar el rendimiento organizativo.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* Impacto Section */}
        <section id="impacto" className="py-16 sm:py-24 bg-white border-b border-slate-200 scroll-mt-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl font-bold text-blue-950">Impacto y Resultados</h2>
              <p className="mt-3 text-slate-600">Transformamos la eficiencia operativa de los procesos de adquisición de talento.</p>
            </div>
            <div className="grid gap-8 md:grid-cols-3 text-center">
              <div className="p-6 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-4xl font-extrabold text-blue-900">40+</p>
                <p className="text-sm text-slate-600 mt-2 font-medium">Consultores Especializados</p>
              </div>
              <div className="p-6 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-4xl font-extrabold text-blue-900">-60%</p>
                <p className="text-sm text-slate-600 mt-2 font-medium">Tiempo de Respuesta en Matching</p>
              </div>
              <div className="p-6 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-4xl font-extrabold text-blue-900">95%</p>
                <p className="text-sm text-slate-600 mt-2 font-medium">Retención de Talento Ejecutivo</p>
              </div>
            </div>
          </div>
        </section>

        {/* Experiencia Section */}
        <section id="experiencia" className="py-16 sm:py-24 bg-slate-50 scroll-mt-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold text-blue-950 mb-4">Nuestra Experiencia en el Sector</h2>
              <p className="text-slate-600 leading-relaxed mb-6">
                Desde 2011, en Nexova respaldamos a más de 120 organizaciones en Europa y América con metodologías de selección rigurosas y soluciones tecnológicas orientadas al crecimiento continuo.
              </p>
              <div className="flex gap-4">
                <div className="border-l-4 border-blue-900 pl-4 py-1">
                  <p className="font-bold text-blue-950">Sede Valencia (España)</p>
                  <p className="text-xs text-slate-500">Operaciones centrales y Headhunting regional</p>
                </div>
                <div className="border-l-4 border-blue-900 pl-4 py-1">
                  <p className="font-bold text-blue-950">Sede Miami (EE.UU.)</p>
                  <p className="text-xs text-slate-500">Expansión LATAM y cuentas internacionales</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer id="contacto" className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-slate-500 sm:px-6 lg:px-8">
          <p>© 2026 Nexova Solutions S.L. — Todos los derechos reservados. Valencia (España) | Miami (EE.UU.)</p>
        </div>
      </footer>
    </div>
  );
}

