'use client'
import React from 'react';
import Link from 'next/link';

export default function DepartmentsPanelPage() {
  return (
    <div className="bg-slate-100 text-slate-900 antialiased min-h-screen">
      <header className="border-b border-slate-300 bg-blue-900 text-white">
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-widest text-blue-200">Nexova Solutions</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Panel Administrativo por Departamentos</h1>
          <p className="mt-2 max-w-3xl text-sm text-blue-100 sm:text-base">
            Vista unificada de operaciones para los 8 departamentos clave. Datos y alertas orientadas a seguimiento diario.
          </p>
          <p className="mt-4">
            <Link href="/" className="inline-flex items-center rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-900 transition hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              Volver al inicio
            </Link>
          </p>
        </section>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-label="Paneles departamentales">
          
          {/* Operaciones de Seleccion */}
          <article className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm flex flex-col">
            <header className="flex items-start justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-blue-950">Operaciones de Seleccion</h2>
              <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-900">Javier Almeida</span>
            </header>
            <p className="text-xs text-slate-600 mb-4 flex-grow">Cribado manual de CVs y falta de visibilidad en tiempo real para clientes.</p>
            <ul className="space-y-3 text-sm border-t border-slate-100 pt-4">
              <li className="flex justify-between items-center">
                <span className="text-slate-600">CVs en revisión</span>
                <strong className="text-lg text-blue-950">312</strong>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-slate-600">Score promedio IA</span>
                <strong className="text-lg text-emerald-600">71<span className="text-xs text-slate-400 font-normal">/100</span></strong>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-slate-600">Sin actualizar</span>
                <strong className="text-lg text-rose-600">47</strong>
              </li>
            </ul>
            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
              <Link href="/scoring" className="text-xs font-semibold text-blue-600 hover:text-blue-800">Ver Ranking Inteligente →</Link>
            </div>
          </article>

          {/* Incidencias */}
          <article className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm flex flex-col">
            <header className="flex items-start justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-blue-950">Incidencias</h2>
              <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-900">Operaciones</span>
            </header>
            <p className="text-xs text-slate-600 mb-4 flex-grow">Gestión de quejas y reclamaciones con SLAs de resolución.</p>
            <ul className="space-y-3 text-sm border-t border-slate-100 pt-4">
              <li className="flex justify-between items-center">
                <span className="text-slate-600">Incidencias Totales</span>
                <strong className="text-lg text-blue-950">100</strong>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-slate-600">Abiertas (Pendientes)</span>
                <strong className="text-lg text-rose-600">32</strong>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-slate-600">Resueltas</span>
                <strong className="text-lg text-emerald-600">38</strong>
              </li>
            </ul>
            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
              <Link href="/incidents" className="text-xs font-semibold text-blue-600 hover:text-blue-800">Ver Dashboard de Incidencias →</Link>
            </div>
          </article>

          {/* Tickets */}
          <article className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm flex flex-col">
            <header className="flex items-start justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-blue-950">Tickets IT</h2>
              <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-900">Infraestructura</span>
            </header>
            <p className="text-xs text-slate-600 mb-4 flex-grow">Helpdesk interno para problemas tecnológicos y accesos.</p>
            <ul className="space-y-3 text-sm border-t border-slate-100 pt-4">
              <li className="flex justify-between items-center">
                <span className="text-slate-600">Tickets Activos</span>
                <strong className="text-lg text-blue-950">12</strong>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-slate-600">Críticos</span>
                <strong className="text-lg text-rose-600">2</strong>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-slate-600">Tiempo medio res.</span>
                <strong className="text-lg text-amber-600">4.2<span className="text-xs text-slate-400 font-normal"> hrs</span></strong>
              </li>
            </ul>
            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
              <Link href="/admin/tickets" className="text-xs font-semibold text-blue-600 hover:text-blue-800">Ver Panel de Tickets →</Link>
            </div>
          </article>

          {/* Soporte IA */}
          <article className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm flex flex-col">
            <header className="flex items-start justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-blue-950">Soporte IA (Triaje)</h2>
              <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-900">Atención Cliente</span>
            </header>
            <p className="text-xs text-slate-600 mb-4 flex-grow">Chatbot inteligente para atención al cliente de primera línea.</p>
            <ul className="space-y-3 text-sm border-t border-slate-100 pt-4">
              <li className="flex justify-between items-center">
                <span className="text-slate-600">Tickets abiertos hoy</span>
                <strong className="text-lg text-blue-950">286</strong>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-slate-600">Agentes Activos</span>
                <strong className="text-lg text-emerald-600">12</strong>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-slate-600">Alerta: Alta carga</span>
                <strong className="text-lg text-rose-600">4<span className="text-xs text-slate-400 font-normal"> ops</span></strong>
              </li>
            </ul>
            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
              <Link href="/support" className="text-xs font-semibold text-blue-600 hover:text-blue-800">Gestionar Triaje IA →</Link>
            </div>
          </article>

          {/* Proveedores */}
          <article className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm flex flex-col">
            <header className="flex items-start justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-blue-950">Proveedores</h2>
              <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-900">Finanzas</span>
            </header>
            <p className="text-xs text-slate-600 mb-4 flex-grow">Gestión de contratación y facturación de servicios externos.</p>
            <ul className="space-y-3 text-sm border-t border-slate-100 pt-4">
              <li className="flex justify-between items-center">
                <span className="text-slate-600">Proveedores Activos</span>
                <strong className="text-lg text-blue-950">45</strong>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-slate-600">Facturas Pendientes</span>
                <strong className="text-lg text-amber-600">8</strong>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-slate-600">Coste mensual</span>
                <strong className="text-lg text-slate-700">14<span className="text-xs text-slate-400 font-normal"> k</span></strong>
              </li>
            </ul>
            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
              <Link href="/suppliers" className="text-xs font-semibold text-blue-600 hover:text-blue-800">Ver Gestión B2B →</Link>
            </div>
          </article>

        </section>
      </main>
    </div>
  );
}
