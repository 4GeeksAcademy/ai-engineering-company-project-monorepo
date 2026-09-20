'use client'
import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  return (
    <div className="bg-white text-blue-950 antialiased min-h-screen">
      <header className="border-b border-blue-200 bg-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8" aria-label="Navegacion principal">
          <Link href="/" className="text-lg font-semibold tracking-wide text-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900">
            Nexova Solutions
          </Link>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-blue-300 p-2 text-blue-900 transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900 md:hidden"
            aria-expanded={isMobileMenuOpen}
            aria-label="Abrir menu principal"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <ul className="hidden items-center gap-4 text-sm md:flex lg:gap-6">
            <li><a href="#servicios" className="hover:text-blue-700">Servicios</a></li>
            <li><a href="#impacto" className="hover:text-blue-700">Impacto</a></li>
            <li><a href="#experiencia" className="hover:text-blue-700">Experiencia</a></li>
            <li>
              {isAuthenticated ? (
                <Link href="/admin/panel" className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-blue-800 font-semibold">Ir al Dashboard</Link>
              ) : (
                <Link href="/login" className="bg-blue-100 text-blue-900 px-4 py-2 rounded-md border border-blue-300 hover:bg-blue-200 font-semibold">Acceso Empleados</Link>
              )}
            </li>
          </ul>
        </nav>
        
        {isMobileMenuOpen && (
          <div className="border-t border-blue-200 bg-white md:hidden" aria-label="Menu principal movil">
            <ul className="mx-auto max-w-6xl space-y-1 px-4 py-3 text-sm sm:px-6">
              <li><a href="#servicios" className="block rounded-md px-3 py-2 text-blue-900 hover:bg-blue-100" onClick={() => setIsMobileMenuOpen(false)}>Servicios</a></li>
              <li><a href="#impacto" className="block rounded-md px-3 py-2 text-blue-900 hover:bg-blue-100" onClick={() => setIsMobileMenuOpen(false)}>Impacto</a></li>
              <li className="pt-2">
                {isAuthenticated ? (
                  <Link href="/admin/panel" className="block rounded-md px-3 py-2 bg-blue-900 text-white font-semibold text-center" onClick={() => setIsMobileMenuOpen(false)}>Ir al Dashboard</Link>
                ) : (
                  <Link href="/login" className="block rounded-md px-3 py-2 text-blue-900 bg-blue-50 border border-blue-200 font-semibold text-center" onClick={() => setIsMobileMenuOpen(false)}>Acceso Empleados</Link>
                )}
              </li>
            </ul>
          </div>
        )}
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-blue-200">
          <article className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:gap-8 sm:px-6 sm:py-12 md:grid-cols-2 md:items-center lg:gap-10 lg:px-8 lg:py-20">
            <header className="space-y-5">
              <p className="inline-flex rounded-full border border-blue-300 bg-blue-100 px-3 py-1 text-xs font-medium uppercase tracking-wider text-blue-900">Consultora consolidada desde 2011</p>
              <h1 className="text-3xl font-bold leading-tight text-blue-950 sm:text-4xl lg:text-5xl">
                Talento, soporte y formacion con operaciones listas para escalar
              </h1>
              <p className="max-w-xl text-sm leading-7 text-blue-900 sm:text-base">
                Ayudamos a empresas medianas de tecnologia, retail y finanzas a reducir tareas manuales, mejorar tiempos de respuesta y tomar decisiones con datos en tiempo real.
              </p>
              <section className="grid gap-3 sm:grid-cols-2 xl:flex">
                <Link href="/application" className="inline-flex items-center justify-center rounded-md bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800">Solicitar diagnostico digital</Link>
                <Link href="/admin/panel" className="inline-flex items-center justify-center rounded-md border border-blue-900 px-5 py-3 text-sm font-semibold text-blue-900 transition hover:bg-blue-900 hover:text-white">Ver paneles por departamento</Link>
              </section>
            </header>
            <figure className="rounded-xl border border-blue-300 bg-blue-100 p-4 shadow-2xl shadow-blue-200/50">
              <img
                src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80"
                alt="Equipo directivo revisando indicadores"
                className="h-64 w-full rounded-lg object-cover sm:h-72 lg:h-80"
                loading="lazy"
              />
              <figcaption className="mt-3 text-xs text-blue-800">Visibilidad ejecutiva para decisiones semanales sin retraso.</figcaption>
            </figure>
          </article>
        </section>

        <section id="servicios" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <h2 className="text-2xl font-semibold text-blue-900 sm:text-3xl">Tres lineas de negocio, una estrategia de modernizacion</h2>
          <article className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <section className="rounded-xl border border-blue-300 bg-blue-100 p-5">
              <h3 className="text-lg font-semibold text-blue-950">Operaciones de Seleccion</h3>
              <p className="mt-3 text-sm leading-6 text-blue-900">Reducimos la carga manual del cribado de CVs y mejoramos la transparencia.</p>
            </section>
            <section className="rounded-xl border border-blue-300 bg-blue-100 p-5">
              <h3 className="text-lg font-semibold text-blue-950">Soporte Externalizado</h3>
              <p className="mt-3 text-sm leading-6 text-blue-900">Acortamos tiempos de resolucion y priorizamos incidencias con mejor contexto.</p>
            </section>
            <section className="rounded-xl border border-blue-300 bg-blue-100 p-5 sm:col-span-2 lg:col-span-1">
              <h3 className="text-lg font-semibold text-blue-950">Formacion Corporativa</h3>
              <p className="mt-3 text-sm leading-6 text-blue-900">Convertimos catalogos estaticos en experiencias de inscripcion y seguimiento.</p>
            </section>
          </article>
        </section>
      </main>

      <footer className="border-t border-blue-800 bg-blue-900 mt-12">
        <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 text-sm text-white sm:px-6 md:flex-row md:justify-between lg:px-8">
          <article>
            <h2 className="font-semibold text-white">Nexova Solutions</h2>
            <p className="text-blue-100">Consultoria de talento y operaciones B2B.</p>
          </article>
          <article>
            <h2 className="font-semibold text-white">Sedes</h2>
            <p className="text-blue-100">Valencia, Espana · Miami, Florida</p>
          </article>
        </section>
      </footer>
    </div>
  );
}
