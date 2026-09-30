import { useEffect, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Link, TALENT_PATH } from "./router";

/* ── Contador animado (respetando prefers-reduced-motion) ── */
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setCount(target);
      return;
    }
    if (target <= 0) return;
    const duration = 2000;
    const step = Math.ceil(target / (duration / 16));
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else setCount(current);
    }, 16);
    return () => clearInterval(timer);
  }, [target]);

  return <span>{count.toLocaleString()}{suffix}</span>;
}

/* ── Hero ── */
export default function Hero({ onNavigate }: { onNavigate: () => void }) {
  const scrollToServices = () => {
    const el = document.getElementById("servicios");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="inicio"
      className="hero-grid-bg hero-glow relative min-h-svh overflow-hidden px-6 pt-24 pb-16 md:pt-32 md:pb-24"
    >
      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2 md:gap-16">
        {/* ── Columna izquierda: contenido principal ── */}
        <div className="flex flex-col gap-6">
          {/* Eyebrow */}
          <p
            className="animate-fade-up delay-1 font-semibold uppercase tracking-[0.2em] text-cyan-400"
          >
            Talento que impulsa el futuro
          </p>

          {/* H1 con clamp() + gradient word */}
          <h1 className="animate-fade-up delay-2 text-[clamp(2.25rem,5vw,4.5rem)] font-black leading-[1.1] tracking-tight text-white">
            Construimos equipos{" "}
            <span className="gradient-text">excepcionales</span>
            <br />
            para empresas en crecimiento
          </h1>

          {/* Subtítulo */}
          <p className="animate-fade-up delay-3 max-w-lg text-lg leading-relaxed text-slate-300">
            Consultora de recursos humanos y adquisición de talento con m&aacute;s
            de 10 a&ntilde;os ayudando a empresas de tecnolog&iacute;a, retail y
            servicios financieros a encontrar y desarrollar el mejor talento.
          </p>

          {/* ── CTAs ── */}
          <div className="animate-fade-up delay-4 flex flex-wrap items-center gap-4">
            <Link
              to={TALENT_PATH}
              onNavigate={onNavigate}
              className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-6 py-3 font-bold text-slate-950 transition-all duration-200 hover:bg-cyan-300 hover:scale-105 focus-visible:scale-105"
            >
              Únete a nuestro banco de talento
              <ArrowRight size={18} aria-hidden="true" />
            </Link>

            <button
              onClick={scrollToServices}
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-6 py-3 font-semibold text-slate-300 transition-all duration-200 hover:border-cyan-400/50 hover:text-cyan-300 hover:scale-105 focus-visible:scale-105"
            >
              Conoce nuestros servicios
              <ChevronDown size={18} aria-hidden="true" />
            </button>
          </div>

          {/* ── Social proof ── */}
          <div className="animate-fade-up delay-5 mt-2 flex flex-wrap items-center gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-2">
              <span
                className="inline-flex size-2 rounded-full bg-green-400"
                aria-hidden="true"
              />
              Confianza verificada
            </span>
            <span className="flex items-center gap-2">
              <span
                className="inline-flex size-2 rounded-full bg-cyan-400"
                aria-hidden="true"
              />
              Tasa de retenci&oacute;n &gt;90%
            </span>
            <span className="flex items-center gap-2">
              <span
                className="inline-flex size-2 rounded-full bg-indigo-400"
                aria-hidden="true"
              />
              Clientes recurrentes
            </span>
          </div>
        </div>

        {/* ── Columna derecha: tarjeta glassmorphism con métricas ── */}
        <div className="animate-fade-up delay-3 glass-card p-8 md:p-10">
          <p className="text-[clamp(3.5rem,6vw,5rem)] font-black text-white leading-none">
            +<AnimatedCounter target={500} />
          </p>
          <p className="mt-3 text-xl text-cyan-100">
            procesos exitosos de selecci&oacute;n
          </p>

          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 text-sm text-slate-300">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Experiencia
              </p>
              <p className="mt-1 text-base font-medium text-white">12 a&ntilde;os</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Presencia
              </p>
              <p className="mt-1 text-base font-medium text-white">
                Espa&ntilde;a y EE. UU.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Sectores
              </p>
              <p className="mt-1 text-base font-medium text-white">
                Tech, retail y finanzas
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Enfoque
              </p>
              <p className="mt-1 text-base font-medium text-white">
                Personas primero
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}