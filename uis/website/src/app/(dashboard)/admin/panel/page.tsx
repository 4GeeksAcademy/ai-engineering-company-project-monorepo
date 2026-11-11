'use client';
import React from 'react';
import Link from 'next/link';

export default function DepartmentsPanelPage() {
  return (
    <div className="text-slate-100 antialiased">
      <header className="rounded-2xl border border-slate-700/60 bg-gradient-to-r from-[#121721] via-[#151d2a] to-[#121721] p-6 sm:p-8 shadow-2xl mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center rounded-lg border border-emerald-400/35 bg-[#0b1017] p-0.5 shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]">
              <span className="flex items-center gap-1.5 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300 border border-emerald-400/25">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE
              </span>
              <span className="px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-white">
                Nexova Solutions · Centro de Operaciones
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
              Panel Administrativo por <span className="text-amber-200">Departamentos</span>
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-white/90">
              Vista unificada de operaciones para los departamentos clave. Datos y alertas orientadas a seguimiento diario en tiempo real.
            </p>
          </div>
          <Link
            href="/"
            className="group relative inline-flex items-center justify-between gap-3 rounded-xl border border-amber-300/30 bg-[#0d121a] p-1.5 pr-3.5 text-xs font-bold text-white shadow-inner transition-all duration-300 hover:border-amber-300/65 hover:bg-[#141c28] hover:shadow-[0_0_24px_rgba(253,230,138,0.14)] shrink-0"
          >
            <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-mono font-bold text-emerald-300 transition-all duration-300 group-hover:bg-emerald-400 group-hover:text-[#0a0d12]">
              <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              <span>WEB</span>
            </span>
            <span className="tracking-wide text-white group-hover:text-amber-200 transition-colors whitespace-nowrap">
              Volver a la Web Oficial
            </span>
          </Link>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-label="Paneles departamentales">
        {/* 1. Operaciones de Selección */}
        <article className="rounded-2xl border border-slate-700/60 bg-[#121721]/90 backdrop-blur-xl p-6 shadow-xl flex flex-col hover:border-emerald-400/40 transition-all">
          <header className="mb-4">
            {/* Fila superior: Etiqueta ganadora alineada a la derecha */}
            <div className="flex items-center justify-end mb-3">
              <div className="inline-flex items-center rounded-lg border border-amber-300/35 bg-[#0b1017] p-0.5 shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]">
                <span className="flex items-center gap-1.5 rounded-md bg-amber-400/15 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 border border-amber-300/25">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_#fde68a]" />
                  LEAD
                </span>
                <span className="px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-white">
                  Javier Almeida
                </span>
              </div>
            </div>
            {/* Título en 1 sola línea */}
            <h2 className="text-lg font-extrabold text-white tracking-tight whitespace-nowrap truncate">
              Operaciones de Selección
            </h2>
          </header>

          <p className="text-xs text-white leading-relaxed mb-5 flex-grow">
            Cribado asistido por IA de CVs y visibilidad en tiempo real para clientes B2B.
          </p>

          <ul className="space-y-3 text-sm border-t border-slate-800/80 pt-4">
            <li className="flex justify-between items-center">
              <span className="text-white/90 text-xs">CVs en revisión</span>
              <strong className="text-lg font-bold text-white">312</strong>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-white/90 text-xs">Score promedio IA</span>
              <strong className="text-lg font-bold text-emerald-400">
                71<span className="text-xs text-slate-400 font-normal">/100</span>
              </strong>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-white/90 text-xs">Sin actualizar</span>
              <strong className="text-lg font-bold text-rose-400">47</strong>
            </li>
          </ul>

          <div className="mt-6 pt-4 border-t border-slate-800/80">
            <Link
              href="/scoring"
              className="group relative flex w-full items-center justify-between gap-2 rounded-xl border border-amber-300/30 bg-[#0d121a] p-1.5 pl-3.5 text-xs font-bold text-white shadow-inner transition-all duration-300 hover:border-amber-300/65 hover:bg-[#141c28] hover:shadow-[0_0_24px_rgba(253,230,138,0.14)]"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_8px_#fde68a] shrink-0 transition-transform group-hover:scale-125" />
                <span className="tracking-wide text-white group-hover:text-amber-200 transition-colors whitespace-nowrap truncate">
                  Ver Ranking Inteligente
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-mono font-bold text-emerald-300 shrink-0 transition-all duration-300 group-hover:bg-emerald-400 group-hover:text-[#0a0d12]">
                <span>ABRIR</span>
                <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                </svg>
              </span>
            </Link>
          </div>
        </article>

        {/* 2. Incidencias */}
        <article className="rounded-2xl border border-slate-700/60 bg-[#121721]/90 backdrop-blur-xl p-6 shadow-xl flex flex-col hover:border-emerald-400/40 transition-all">
          <header className="mb-4">
            <div className="flex items-center justify-end mb-3">
              <div className="inline-flex items-center rounded-lg border border-emerald-400/35 bg-[#0b1017] p-0.5 shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]">
                <span className="flex items-center gap-1.5 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300 border border-emerald-400/25">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                  AREA
                </span>
                <span className="px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-white">
                  Operaciones
                </span>
              </div>
            </div>
            <h2 className="text-lg font-extrabold text-white tracking-tight whitespace-nowrap truncate">
              Incidencias
            </h2>
          </header>

          <p className="text-xs text-white leading-relaxed mb-5 flex-grow">
            Gestión de quejas y reclamaciones conectada en vivo con el agente LangGraph.
          </p>

          <ul className="space-y-3 text-sm border-t border-slate-800/80 pt-4">
            <li className="flex justify-between items-center">
              <span className="text-white/90 text-xs">Incidencias Totales</span>
              <strong className="text-lg font-bold text-white">100</strong>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-white/90 text-xs">Abiertas (Pendientes)</span>
              <strong className="text-lg font-bold text-amber-300">32</strong>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-white/90 text-xs">Resueltas</span>
              <strong className="text-lg font-bold text-emerald-400">38</strong>
            </li>
          </ul>

          <div className="mt-6 pt-4 border-t border-slate-800/80">
            <Link
              href="/incidents"
              className="group relative flex w-full items-center justify-between gap-2 rounded-xl border border-amber-300/30 bg-[#0d121a] p-1.5 pl-3.5 text-xs font-bold text-white shadow-inner transition-all duration-300 hover:border-amber-300/65 hover:bg-[#141c28] hover:shadow-[0_0_24px_rgba(253,230,138,0.14)]"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_8px_#fde68a] shrink-0 transition-transform group-hover:scale-125" />
                <span className="tracking-wide text-white group-hover:text-amber-200 transition-colors whitespace-nowrap truncate">
                  Ver Dashboard de Incidencias
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-mono font-bold text-emerald-300 shrink-0 transition-all duration-300 group-hover:bg-emerald-400 group-hover:text-[#0a0d12]">
                <span>ABRIR</span>
                <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                </svg>
              </span>
            </Link>
          </div>
        </article>

        {/* 3. Tickets IT */}
        <article className="rounded-2xl border border-slate-700/60 bg-[#121721]/90 backdrop-blur-xl p-6 shadow-xl flex flex-col hover:border-emerald-400/40 transition-all">
          <header className="mb-4">
            <div className="flex items-center justify-end mb-3">
              <div className="inline-flex items-center rounded-lg border border-emerald-400/35 bg-[#0b1017] p-0.5 shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]">
                <span className="flex items-center gap-1.5 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300 border border-emerald-400/25">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                  SYS
                </span>
                <span className="px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-white">
                  Infraestructura
                </span>
              </div>
            </div>
            <h2 className="text-lg font-extrabold text-white tracking-tight whitespace-nowrap truncate">
              Tickets IT
            </h2>
          </header>

          <p className="text-xs text-white leading-relaxed mb-5 flex-grow">
            Helpdesk interno para problemas tecnológicos, sincronización CRM y accesos.
          </p>

          <ul className="space-y-3 text-sm border-t border-slate-800/80 pt-4">
            <li className="flex justify-between items-center">
              <span className="text-white/90 text-xs">Tickets Activos</span>
              <strong className="text-lg font-bold text-white">12</strong>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-white/90 text-xs">Críticos</span>
              <strong className="text-lg font-bold text-rose-400">2</strong>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-white/90 text-xs">Tiempo medio res.</span>
              <strong className="text-lg font-bold text-amber-200">
                4.2<span className="text-xs text-slate-400 font-normal"> hrs</span>
              </strong>
            </li>
          </ul>

          <div className="mt-6 pt-4 border-t border-slate-800/80">
            <Link
              href="/admin/tickets"
              className="group relative flex w-full items-center justify-between gap-2 rounded-xl border border-amber-300/30 bg-[#0d121a] p-1.5 pl-3.5 text-xs font-bold text-white shadow-inner transition-all duration-300 hover:border-amber-300/65 hover:bg-[#141c28] hover:shadow-[0_0_24px_rgba(253,230,138,0.14)]"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_8px_#fde68a] shrink-0 transition-transform group-hover:scale-125" />
                <span className="tracking-wide text-white group-hover:text-amber-200 transition-colors whitespace-nowrap truncate">
                  Ver Panel de Tickets
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-mono font-bold text-emerald-300 shrink-0 transition-all duration-300 group-hover:bg-emerald-400 group-hover:text-[#0a0d12]">
                <span>ABRIR</span>
                <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                </svg>
              </span>
            </Link>
          </div>
        </article>

        {/* 4. Soporte IA */}
        <article className="rounded-2xl border border-slate-700/60 bg-[#121721]/90 backdrop-blur-xl p-6 shadow-xl flex flex-col hover:border-emerald-400/40 transition-all">
          <header className="mb-4">
            <div className="flex items-center justify-end mb-3">
              <div className="inline-flex items-center rounded-lg border border-emerald-400/35 bg-[#0b1017] p-0.5 shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]">
                <span className="flex items-center gap-1.5 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300 border border-emerald-400/25">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                  AI
                </span>
                <span className="px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-white">
                  Atención Cliente
                </span>
              </div>
            </div>
            <h2 className="text-lg font-extrabold text-white tracking-tight whitespace-nowrap truncate">
              Soporte IA (Triaje)
            </h2>
          </header>

          <p className="text-xs text-white leading-relaxed mb-5 flex-grow">
            Asistente inteligente con enrutamiento autónomo para atención de primera línea.
          </p>

          <ul className="space-y-3 text-sm border-t border-slate-800/80 pt-4">
            <li className="flex justify-between items-center">
              <span className="text-white/90 text-xs">Tickets abiertos hoy</span>
              <strong className="text-lg font-bold text-white">286</strong>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-white/90 text-xs">Agentes Activos</span>
              <strong className="text-lg font-bold text-emerald-400">12</strong>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-white/90 text-xs">Alerta: Alta carga</span>
              <strong className="text-lg font-bold text-rose-400">
                4<span className="text-xs text-slate-400 font-normal"> ops</span>
              </strong>
            </li>
          </ul>

          <div className="mt-6 pt-4 border-t border-slate-800/80">
            <Link
              href="/support"
              className="group relative flex w-full items-center justify-between gap-2 rounded-xl border border-amber-300/30 bg-[#0d121a] p-1.5 pl-3.5 text-xs font-bold text-white shadow-inner transition-all duration-300 hover:border-amber-300/65 hover:bg-[#141c28] hover:shadow-[0_0_24px_rgba(253,230,138,0.14)]"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_8px_#fde68a] shrink-0 transition-transform group-hover:scale-125" />
                <span className="tracking-wide text-white group-hover:text-amber-200 transition-colors whitespace-nowrap truncate">
                  Gestionar Triaje IA
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-mono font-bold text-emerald-300 shrink-0 transition-all duration-300 group-hover:bg-emerald-400 group-hover:text-[#0a0d12]">
                <span>ABRIR</span>
                <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                </svg>
              </span>
            </Link>
          </div>
        </article>

        {/* 5. Proveedores */}
        <article className="rounded-2xl border border-slate-700/60 bg-[#121721]/90 backdrop-blur-xl p-6 shadow-xl flex flex-col hover:border-emerald-400/40 transition-all">
          <header className="mb-4">
            <div className="flex items-center justify-end mb-3">
              <div className="inline-flex items-center rounded-lg border border-amber-300/35 bg-[#0b1017] p-0.5 shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]">
                <span className="flex items-center gap-1.5 rounded-md bg-amber-400/15 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 border border-amber-300/25">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_#fde68a]" />
                  B2B
                </span>
                <span className="px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-white">
                  Finanzas
                </span>
              </div>
            </div>
            <h2 className="text-lg font-extrabold text-white tracking-tight whitespace-nowrap truncate">
              Proveedores
            </h2>
          </header>

          <p className="text-xs text-white leading-relaxed mb-5 flex-grow">
            Gestión de contratación, tarifas por hora y estado de proveedores externos.
          </p>

          <ul className="space-y-3 text-sm border-t border-slate-800/80 pt-4">
            <li className="flex justify-between items-center">
              <span className="text-white/90 text-xs">Proveedores Activos</span>
              <strong className="text-lg font-bold text-white">45</strong>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-white/90 text-xs">Facturas Pendientes</span>
              <strong className="text-lg font-bold text-amber-300">8</strong>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-white/90 text-xs">Coste mensual</span>
              <strong className="text-lg font-bold text-emerald-400">
                14<span className="text-xs text-slate-400 font-normal"> k</span>
              </strong>
            </li>
          </ul>

          <div className="mt-6 pt-4 border-t border-slate-800/80">
            <Link
              href="/suppliers"
              className="group relative flex w-full items-center justify-between gap-2 rounded-xl border border-amber-300/30 bg-[#0d121a] p-1.5 pl-3.5 text-xs font-bold text-white shadow-inner transition-all duration-300 hover:border-amber-300/65 hover:bg-[#141c28] hover:shadow-[0_0_24px_rgba(253,230,138,0.14)]"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_8px_#fde68a] shrink-0 transition-transform group-hover:scale-125" />
                <span className="tracking-wide text-white group-hover:text-amber-200 transition-colors whitespace-nowrap truncate">
                  Ver Gestión B2B
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-mono font-bold text-emerald-300 shrink-0 transition-all duration-300 group-hover:bg-emerald-400 group-hover:text-[#0a0d12]">
                <span>ABRIR</span>
                <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                </svg>
              </span>
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
