'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeAgentRoute, setActiveAgentRoute] = useState<'tool' | 'rag'>('tool');
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen nx-spatial-bg text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200 relative overflow-x-hidden">
      {/* Malla espacial 3D con movimiento en perspectiva sobre fondo metalizado */}
      <div className="nx-spatial-mesh" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 h-[560px] w-[960px] rounded-full bg-slate-500/15 blur-[150px]" />
        <div className="absolute top-[30%] left-[12%] h-[340px] w-[340px] rounded-full bg-amber-400/5 blur-[130px]" />
        <div className="absolute bottom-[10%] right-[10%] h-[420px] w-[420px] rounded-full bg-emerald-500/8 blur-[150px]" />
        <div className="mx-auto flex h-full max-w-7xl justify-between px-6 opacity-15">
          <div className="h-full w-px bg-gradient-to-b from-transparent via-slate-400/40 to-transparent" />
          <div className="hidden h-full w-px bg-gradient-to-b from-transparent via-slate-400/20 to-transparent md:block" />
          <div className="hidden h-full w-px bg-gradient-to-b from-transparent via-slate-400/20 to-transparent lg:block" />
          <div className="h-full w-px bg-gradient-to-b from-transparent via-slate-400/40 to-transparent" />
        </div>
      </div>

      {/* Navbar Flotante Glassmorphic */}
      <header className="sticky top-4 z-50 mx-auto max-w-6xl px-4 sm:px-6">
        <nav
          aria-label="Navegación principal"
          className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-[#121721]/80 px-5 py-3.5 shadow-2xl shadow-black/60 backdrop-blur-xl"
        >
          <Link
            href="/"
            className="group flex items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-700 text-[#0a0d12] font-black text-lg shadow-lg shadow-emerald-500/25 transition-transform group-hover:scale-105">
              N
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white leading-none">
                Nexova
              </span>
              <span className="text-[11px] font-medium tracking-widest uppercase text-emerald-400/80 mt-0.5">
                Solutions
              </span>
            </div>
          </Link>

          {/* Enlaces Desktop */}
          <ul className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
            <li>
              <a href="#command-center" className="transition hover:text-emerald-400">
                Command Center
              </a>
            </li>
            <li>
              <a href="#servicios" className="transition hover:text-emerald-400">
                Líneas de Negocio
              </a>
            </li>
            <li>
              <a href="#impacto" className="transition hover:text-emerald-400">
                Impacto & SLA
              </a>
            </li>
            <li>
              <a href="#arquitectura" className="transition hover:text-emerald-400">
                Arquitectura IA
              </a>
            </li>
          </ul>

          {/* CTA Derecha */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                href="/admin/panel"
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-500/15 px-5 py-2 text-xs font-semibold tracking-wide text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.25)] transition hover:bg-emerald-400 hover:text-[#0a0d12]"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Ir al Dashboard →
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-5 py-2 text-xs font-semibold tracking-wide text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.2)] transition hover:border-emerald-400 hover:bg-emerald-400 hover:text-[#0a0d12]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Acceso Corporativo →
              </Link>
            )}
          </div>

          {/* Botón Móvil */}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-emerald-500/30 p-2 text-emerald-300 transition hover:bg-emerald-500/10 md:hidden"
            aria-expanded={isMobileMenuOpen}
            aria-label="Abrir menú principal"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </nav>

        {/* Menú Móvil */}
        {isMobileMenuOpen && (
          <div
            className="mt-2 rounded-2xl border border-emerald-500/20 bg-[#121721]/95 p-4 shadow-2xl backdrop-blur-xl md:hidden"
            aria-label="Menú principal móvil"
          >
            <ul className="space-y-2 text-sm text-slate-200">
              <li>
                <a
                  href="#command-center"
                  className="block rounded-lg px-3 py-2 hover:bg-emerald-500/10 hover:text-emerald-300"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Command Center
                </a>
              </li>
              <li>
                <a
                  href="#servicios"
                  className="block rounded-lg px-3 py-2 hover:bg-emerald-500/10 hover:text-emerald-300"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Líneas de Negocio
                </a>
              </li>
              <li>
                <a
                  href="#impacto"
                  className="block rounded-lg px-3 py-2 hover:bg-emerald-500/10 hover:text-emerald-300"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Impacto & SLA
                </a>
              </li>
              <li className="pt-2 border-t border-emerald-500/20">
                <Link
                  href={isAuthenticated ? '/admin/panel' : '/login'}
                  className="block w-full rounded-xl bg-emerald-400 py-2.5 text-center font-semibold text-[#0a0d12]"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {isAuthenticated ? 'Ir al Dashboard' : 'Acceso Corporativo'}
                </Link>
              </li>
            </ul>
          </div>
        )}
      </header>

      <main className="relative z-10">
        {/* HERO SECTION */}
        <section className="mx-auto max-w-6xl px-4 pt-14 pb-12 sm:px-6 lg:px-8 lg:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              Plataforma B2B de Operaciones & IA · Desde 2011
            </div>

            {/* Titular Ejecutivo con acentos Champagne Gold y Emerald */}
            <h1 className="mt-7 text-4xl font-bold tracking-tight text-slate-100 sm:text-5xl lg:text-6xl lg:leading-[1.12]">
              El motor{' '}
              <span className="bg-gradient-to-r from-amber-200 via-amber-100 to-amber-300 bg-clip-text text-transparent">
                inteligente
              </span>{' '}
              detrás de tu{' '}
              <span className="bg-gradient-to-r from-amber-200 via-amber-100 to-amber-300 bg-clip-text text-transparent">
                talento
              </span>{' '}
              y soporte{' '}
              <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                operativo
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300/90 sm:text-lg">
              Ayudamos a empresas medianas de tecnología, retail y finanzas a eliminar cuellos de botella manuales mediante{' '}
              <span className="text-slate-100 font-medium">Scoring Automatizado de Candidatos</span>,{' '}
              <span className="text-slate-100 font-medium">Agentes de Soporte con LangGraph</span> y{' '}
              <span className="text-slate-100 font-medium">Telemetría Ejecutiva en Vivo</span>.
            </p>

            {/* Botones de Acción */}
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <Link
                href={isAuthenticated ? '/admin/panel' : '/login'}
                className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-7 py-3.5 text-sm font-bold text-[#0a0d12] shadow-[0_0_35px_rgba(16,185,129,0.45)] transition hover:bg-emerald-300 hover:scale-[1.02]"
              >
                Empezar Diagnóstico Digital
              </Link>
              <a
                href="#command-center"
                className="inline-flex items-center justify-center rounded-full border border-emerald-500/30 bg-[#121721]/70 px-7 py-3.5 text-sm font-semibold text-slate-200 backdrop-blur-md transition hover:border-emerald-400/60 hover:bg-emerald-500/10"
              >
                Ver Consola en Vivo
              </a>
            </div>
          </div>

          {/* UNIFIED COMMAND CENTER (Consola Panorámica de 3 Módulos) */}
          <div
            id="command-center"
            className="mt-14 rounded-2xl border border-emerald-500/25 bg-[#0d1118]/90 p-3 sm:p-5 shadow-[0_25px_90px_-15px_rgba(0,0,0,0.85),0_0_50px_rgba(16,185,129,0.12)] backdrop-blur-2xl"
          >
            {/* Barra de Ventana Superior */}
            <div className="flex items-center justify-between border-b border-emerald-500/15 px-3 pb-3.5 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-400/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] tracking-wider text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Unified Command Center · Nexova OS v2.4
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-emerald-400/80 font-mono">
                <span>AUTH GUARD: ACTIVE</span>
              </div>
            </div>

            {/* Grid de 3 Módulos Operativos */}
            <div className="mt-4 grid gap-4 lg:grid-cols-12">
              {/* Módulo 1: AI Candidate Scoring (4 cols) */}
              <div className="lg:col-span-4 rounded-xl border border-emerald-500/20 bg-[#091E19]/90 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-semibold flex items-center gap-2">
                      <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      AI Candidate Scoring
                    </span>
                    <span className="text-slate-500">•••</span>
                  </div>

                  <div className="mt-5 flex items-baseline justify-between">
                    <div>
                      <span className="text-5xl font-extrabold tracking-tight text-white">98</span>
                      <span className="text-xl font-medium text-slate-400">/100</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      Verified Match
                    </span>
                  </div>

                  {/* Barra de progreso */}
                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full w-[98%] rounded-full bg-gradient-to-r from-emerald-500 to-teal-300 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                  </div>
                </div>

                {/* Etiquetas de verificación */}
                <div className="mt-6 space-y-2 pt-4 border-t border-emerald-500/10">
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
                      ✓ Senior AI Engineer
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
                      ✓ Stage: HIRED
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
                      ✓ Garantía 90 días
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 pt-1">
                    Cribado automático conectado en vivo a <code className="text-emerald-300">/scoring/candidates</code>.
                  </p>
                </div>
              </div>

              {/* Módulo 2: Live LangGraph Support Agent (5 cols) */}
              <div className="lg:col-span-5 rounded-xl border border-emerald-500/20 bg-[#091E19]/90 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-200 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                      Live LangGraph Support Agent
                    </span>
                    <div className="inline-flex rounded-lg border border-emerald-500/25 bg-[#0a0d12] p-0.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setActiveAgentRoute('tool')}
                        className={`rounded-md px-2.5 py-1 font-medium transition ${
                          activeAgentRoute === 'tool'
                            ? 'bg-emerald-400 text-[#0a0d12] font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Ruta Tool (30ms)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveAgentRoute('rag')}
                        className={`rounded-md px-2.5 py-1 font-medium transition ${
                          activeAgentRoute === 'rag'
                            ? 'bg-emerald-400 text-[#0a0d12] font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Ruta RAG (Qdrant)
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    {activeAgentRoute === 'tool' ? (
                      <>
                        Resolviendo ticket operativo en <span className="text-emerald-400 font-semibold">30ms</span> vía{' '}
                        <code className="text-amber-200">incident_tool</code>
                      </>
                    ) : (
                      <>
                        Anclaje documental verificado con <span className="text-emerald-400 font-semibold">score ≥ 0.70</span> vía{' '}
                        <code className="text-amber-200">retrieve</code>
                      </>
                    )}
                  </p>

                  {/* Visualización SVG del Grafo de Estados */}
                  <div className="mt-4 rounded-lg border border-emerald-500/15 bg-[#051410] p-3">
                    <svg viewBox="0 0 380 110" className="w-full h-24">
                      {/* Aristas */}
                      <line x1="65" y1="55" x2="145" y2="55" stroke="#10b981" strokeWidth="1.8" strokeDasharray="3 2" />
                      <path
                        d="M 195 55 C 230 55, 240 28, 285 28"
                        fill="none"
                        stroke={activeAgentRoute === 'tool' ? '#10b981' : '#334155'}
                        strokeWidth={activeAgentRoute === 'tool' ? '2.2' : '1.2'}
                      />
                      <path
                        d="M 195 55 C 230 55, 240 82, 285 82"
                        fill="none"
                        stroke={activeAgentRoute === 'rag' ? '#10b981' : '#334155'}
                        strokeWidth={activeAgentRoute === 'rag' ? '2.2' : '1.2'}
                      />

                      {/* Nodo 1: validate_input */}
                      <circle cx="45" cy="55" r="16" fill="#121721" stroke="#fbbf24" strokeWidth="1.8" />
                      <text x="45" y="84" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
                        validate
                      </text>

                      {/* Nodo 2: classify_intent */}
                      <rect x="145" y="37" width="50" height="36" rx="10" fill="#092920" stroke="#10b981" strokeWidth="2" />
                      <text x="170" y="58" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="bold" fontFamily="monospace">
                        router
                      </text>
                      <text x="170" y="86" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
                        classify_intent
                      </text>

                      {/* Nodo 3A: incident_tool */}
                      <circle
                        cx="305"
                        cy="28"
                        r="15"
                        fill={activeAgentRoute === 'tool' ? '#064e3b' : '#0f172a'}
                        stroke={activeAgentRoute === 'tool' ? '#34d399' : '#475569'}
                        strokeWidth="2"
                      />
                      <text x="305" y="31" textAnchor="middle" fill="#ecfdf5" fontSize="8" fontFamily="monospace">
                        TOOL
                      </text>
                      <text x="348" y="31" textAnchor="start" fill="#6ee7b7" fontSize="8" fontFamily="monospace">
                        #ticket
                      </text>

                      {/* Nodo 3B: retrieve RAG */}
                      <circle
                        cx="305"
                        cy="82"
                        r="15"
                        fill={activeAgentRoute === 'rag' ? '#064e3b' : '#0f172a'}
                        stroke={activeAgentRoute === 'rag' ? '#34d399' : '#475569'}
                        strokeWidth="2"
                      />
                      <text x="305" y="85" textAnchor="middle" fill="#ecfdf5" fontSize="8" fontFamily="monospace">
                        RAG
                      </text>
                      <text x="348" y="85" textAnchor="start" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                        briefing
                      </text>
                    </svg>
                  </div>
                </div>

                {/* Trace Output */}
                <div className="mt-3 rounded-lg bg-[#0a0d12]/90 px-3 py-2 font-mono text-[11px] text-emerald-300 border border-emerald-500/15">
                  <span className="text-slate-500">trace: </span>
                  {activeAgentRoute === 'tool'
                    ? "['validate_input', 'classify_intent', 'incident_tool', 'format_tool_answer']"
                    : "['validate_input', 'classify_intent', 'retrieve', 'generate_answer']"}
                </div>
              </div>

              {/* Módulo 3: Real-Time Telemetry (3 cols) */}
              <div className="lg:col-span-3 rounded-xl border border-emerald-500/20 bg-[#091E19]/90 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-semibold">Telemetry & SLA</span>
                    <span className="text-slate-500">•••</span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-[#051410] p-2.5 border border-emerald-500/15">
                      <span className="text-xl font-bold text-emerald-400">-62%</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Carga manual</p>
                    </div>
                    <div className="rounded-lg bg-[#051410] p-2.5 border border-emerald-500/15">
                      <span className="text-xl font-bold text-amber-200">99.8%</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">SLA Uptime</p>
                    </div>
                  </div>

                  {/* Gráfica SVG de Telemetría */}
                  <div className="mt-4">
                    <svg viewBox="0 0 220 95" className="w-full h-24 overflow-visible">
                      <defs>
                        <linearGradient id="emeraldWave" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <line x1="0" y1="25" x2="220" y2="25" stroke="#1e293b" strokeDasharray="2 2" strokeWidth="1" />
                      <line x1="0" y1="50" x2="220" y2="50" stroke="#1e293b" strokeDasharray="2 2" strokeWidth="1" />
                      <line x1="0" y1="75" x2="220" y2="75" stroke="#1e293b" strokeDasharray="2 2" strokeWidth="1" />
                      <path
                        d="M 0 65 Q 25 80, 45 52 T 90 45 T 135 58 T 180 35 T 220 15 L 220 90 L 0 90 Z"
                        fill="url(#emeraldWave)"
                      />
                      <path
                        d="M 0 65 Q 25 80, 45 52 T 90 45 T 135 58 T 180 35 T 220 15"
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="2.2"
                      />
                      <circle cx="220" cy="15" r="4" fill="#34d399" />
                    </svg>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between border-t border-emerald-500/10 pt-3 text-[11px] text-slate-400 font-mono">
                  <span>P1 SLA: &lt; 2h</span>
                  <span className="text-emerald-400">LIVE 200 OK</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BARRA DE MÉTRICAS EJECUTIVAS (IMPACTO) */}
        <section id="impacto" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-emerald-500/20 bg-[#121721]/60 p-5 text-center backdrop-blur-md">
              <p className="text-3xl font-extrabold text-amber-200">+250</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">
                Empresas B2B Activas
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-[#121721]/60 p-5 text-center backdrop-blur-md">
              <p className="text-3xl font-extrabold text-emerald-400">90 Días</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">
                Garantía en Headhunting
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-[#121721]/60 p-5 text-center backdrop-blur-md">
              <p className="text-3xl font-extrabold text-white">11/11</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">
                Evals Deterministas IA
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-[#121721]/60 p-5 text-center backdrop-blur-md">
              <p className="text-3xl font-extrabold text-emerald-400">24/7</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">
                Telemetría & Observabilidad
              </p>
            </div>
          </div>
        </section>

        {/* TRES LÍNEAS DE NEGOCIO (BENTO GRID) */}
        <section id="servicios" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
              Ecosistema Corporativo
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Tres líneas de negocio,{' '}
              <span className="text-amber-200">una arquitectura de modernización</span>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Cada unidad operativa de Nexova Solutions está conectada a nuestros servicios centrales de Inteligencia Artificial, reduciendo fricción y garantizando trazabilidad total.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {/* Línea 01 */}
            <article className="group relative rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-[#08201B] to-[#051410] p-7 transition hover:border-emerald-400/50 hover:shadow-[0_0_40px_rgba(16,185,129,0.12)]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-md">
                  01 · TALENT PIPELINE
                </span>
                <span className="text-amber-200/80 text-xs font-mono">SLA 90d</span>
              </div>
              <h3 className="mt-5 text-xl font-bold text-white group-hover:text-emerald-300 transition">
                Operaciones de Selección & Scoring IA
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-300/90">
                Reducimos la carga manual del cribado de CVs mediante modelos de puntuación objetiva (`score_ia`), seguimiento por etapas y garantía de reposición de 90 días naturales.
              </p>
              <div className="mt-6 pt-4 border-t border-emerald-500/15 flex items-center justify-between text-xs text-emerald-300 font-medium">
                <span>Explorar módulo de Selección</span>
                <Link href={isAuthenticated ? '/scoring' : '/login'} className="hover:underline">
                  Abrir →
                </Link>
              </div>
            </article>

            {/* Línea 02 */}
            <article className="group relative rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-[#08201B] to-[#051410] p-7 transition hover:border-emerald-400/50 hover:shadow-[0_0_40px_rgba(16,185,129,0.12)]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-md">
                  02 · LANGGRAPH AGENT
                </span>
                <span className="text-emerald-300 text-xs font-mono">Real-Time</span>
              </div>
              <h3 className="mt-5 text-xl font-bold text-white group-hover:text-emerald-300 transition">
                Soporte Externalizado Inteligente
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-300/90">
                Células de soporte B2B asistidas por nuestro agente híbrido en LangGraph que consulta políticas en Qdrant (RAG) y el estado de incidencias en tiempo real con fallback honesto.
              </p>
              <div className="mt-6 pt-4 border-t border-emerald-500/15 flex items-center justify-between text-xs text-emerald-300 font-medium">
                <span>Gestionar tickets e incidencias</span>
                <Link href={isAuthenticated ? '/incidents' : '/login'} className="hover:underline">
                  Abrir →
                </Link>
              </div>
            </article>

            {/* Línea 03 */}
            <article className="group relative rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-[#08201B] to-[#051410] p-7 transition hover:border-emerald-400/50 hover:shadow-[0_0_40px_rgba(16,185,129,0.12)]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-md">
                  03 · CORPORATE L&D
                </span>
                <span className="text-amber-200/80 text-xs font-mono">B2B Scale</span>
              </div>
              <h3 className="mt-5 text-xl font-bold text-white group-hover:text-emerald-300 transition">
                Formación Corporativa & Proveedores
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-300/90">
                Transformamos catálogos estáticos en experiencias de capacitación medibles, integradas con nuestra red auditada de proveedores globales y control de inventario.
              </p>
              <div className="mt-6 pt-4 border-t border-emerald-500/15 flex items-center justify-between text-xs text-emerald-300 font-medium">
                <span>Directorio de proveedores</span>
                <Link href={isAuthenticated ? '/suppliers' : '/login'} className="hover:underline">
                  Abrir →
                </Link>
              </div>
            </article>
          </div>
        </section>

        {/* SECCIÓN ARQUITECTURA IA & SEGURIDAD */}
        <section id="arquitectura" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-emerald-500/25 bg-gradient-to-r from-[#121721] via-[#09251E] to-[#121721] p-8 sm:p-10 shadow-2xl">
            <div className="grid gap-8 md:grid-cols-12 md:items-center">
              <div className="md:col-span-8 space-y-3">
                <span className="inline-flex items-center gap-2 rounded-md bg-emerald-500/15 px-3 py-1 font-mono text-xs font-semibold text-emerald-300">
                  INGENIERÍA DE GRADO DE PRODUCCIÓN
                </span>
                <h2 className="text-2xl font-bold text-white sm:text-3xl">
                  Arquitectura auditable con trazabilidad paso a paso
                </h2>
                <p className="text-sm leading-relaxed text-slate-300 max-w-2xl">
                  Todos nuestros endpoints operan bajo el estándar <strong className="text-white">Auth Guard JWT</strong>, con validación estricta en Pydantic, búsqueda vectorial con umbral anti-alucinaciones y herramientas externas con timeout garantizado de 5.0 segundos.
                </p>
              </div>
              <div className="md:col-span-4 flex flex-col sm:flex-row md:flex-col gap-3 justify-end">
                <Link
                  href={isAuthenticated ? '/admin/panel' : '/login'}
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-400 px-6 py-3.5 text-sm font-bold text-[#0a0d12] shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-300"
                >
                  {isAuthenticated ? 'Acceder al Panel Ejecutivo' : 'Iniciar Sesión en Plataforma'}
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-xl border border-emerald-500/30 bg-[#0a0d12]/60 px-6 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/10"
                >
                  Solicitar Alta de Cuenta
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER CORPORATIVO */}
      <footer className="relative z-10 border-t border-emerald-500/20 bg-[#030C0A]">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-slate-400 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold">
              N
            </div>
            <div>
              <p className="font-semibold text-slate-100">Nexova Solutions</p>
              <p className="text-xs text-slate-400">
                Consultoría de talento, soporte inteligente y operaciones B2B.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 text-xs text-slate-400">
            <div>
              <span className="font-semibold text-slate-200">Sedes Globales:</span> Valencia, España · Miami, Florida
            </div>
            <div>
              <span className="font-semibold text-emerald-400">●</span> Sistema Operativo Activo
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
