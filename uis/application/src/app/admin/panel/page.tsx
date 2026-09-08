'use client'
import React, { useState } from 'react';
import Link from 'next/link';

export default function DepartmentsPanelPage() {
  const [activePanel, setActivePanel] = useState('operaciones-seleccion');
  
  // States for interactive elements
  const [scoringPanelOpen, setScoringPanelOpen] = useState(true);
  const [preseleccionadosOpen, setPreseleccionadosOpen] = useState(false);
  const [seleccionadosOpen, setSeleccionadosOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{role: string, text: string}[]>([]);

  const navItems = [
    { id: 'operaciones-seleccion', label: 'Scoring IA' },
    { id: 'formacion-corporativa', label: 'Formacion Corporativa' },
    { id: 'soporte-cliente', label: 'Soporte al Cliente (Triaje IA)' },
    { id: 'ventas-desarrollo', label: 'Ventas y Desarrollo' },
    { id: 'marketing-comunicacion', label: 'Marketing y Comunicacion' },
    { id: 'recursos-humanos', label: 'Recursos Humanos' },
    { id: 'tecnologia-infraestructura', label: 'Tecnologia e Infraestructura' },
    { id: 'direccion-ejecutiva', label: 'Direccion Ejecutiva' },
  ];

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatMessages([...chatMessages, { role: 'user', text: chatInput }]);
    setChatInput('');
    setTimeout(() => {
      setChatMessages(prev => [...prev, { role: 'bot', text: 'Ticket registrado y escalado.' }]);
    }, 1000);
  };

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

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[280px,1fr] lg:px-8">
        <aside className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm lg:sticky lg:top-6 lg:h-fit" aria-label="Navegador lateral de departamentos">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-900">Departamentos</h2>
          <nav className="mt-3">
            <ul className="space-y-1 text-sm">
              {navItems.map(item => (
                <li key={item.id}>
                  <button
                    onClick={() => setActivePanel(item.id)}
                    className={`w-full text-left rounded-md px-3 py-2 text-blue-900 hover:bg-blue-100 ${activePanel === item.id ? 'bg-blue-100 font-semibold' : ''}`}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3" aria-label="Paneles departamentales">
          
          {/* Operaciones de Seleccion */}
          {activePanel === 'operaciones-seleccion' && (
            <article className="scroll-mt-24 rounded-xl border border-blue-200 bg-white p-5 shadow-sm md:col-span-2 xl:col-span-3">
              <header className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-blue-950">Operaciones de Seleccion</h2>
                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-900">Javier Almeida</span>
              </header>
              <p className="mt-2 text-sm text-slate-700">Cribado manual de CVs y falta de visibilidad en tiempo real para clientes.</p>
              <ul className="mt-4 space-y-2 text-sm md:max-w-md">
                <li className="flex justify-between"><span>CVs en revision</span><strong>312</strong></li>
                <li className="flex justify-between"><span>Score promedio IA</span><strong>71/100</strong></li>
                <li className="flex justify-between"><span>Candidatos sin actualizar</span><strong className="text-rose-700">47</strong></li>
              </ul>
              
              <section className="mt-6">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-blue-950">Panel de Scoring IA</h3>
                    <p className="mt-1 text-sm text-slate-700">Ranking automatizado renderizado en este panel principal.</p>
                  </div>
                  <button
                    onClick={() => setScoringPanelOpen(!scoringPanelOpen)}
                    className="inline-flex items-center rounded-md border border-emerald-300 bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-200"
                  >
                    {scoringPanelOpen ? 'Activado' : 'Desactivado'}
                  </button>
                </header>
                
                {scoringPanelOpen && (
                  <div className="mt-4">
                    <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-2">
                      <h4 className="text-sm font-semibold text-slate-700">Candidatos Nuevos</h4>
                      <div className="flex items-center gap-2">
                        <label htmlFor="sortCandidates" className="text-xs font-medium text-slate-600">Ordenar por:</label>
                        <select id="sortCandidates" className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                          <option value="desc">Mayor Score IA primero</option>
                          <option value="asc">Menor Score IA primero</option>
                        </select>
                      </div>
                    </div>
                    <div className="p-4 text-center text-sm text-slate-500 border border-dashed border-slate-300 rounded-md">
                      [Lista de candidatos dinámica iría aquí]
                    </div>

                    <div className="mt-8 border-t border-slate-200 pt-6">
                      <h3 className="text-base font-semibold text-blue-950">Pipeline de Seguimiento</h3>
                      <div className="mt-4 flex flex-col gap-3">
                        <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                          <button onClick={() => setPreseleccionadosOpen(!preseleccionadosOpen)} className="flex w-full items-center justify-between p-4 hover:bg-slate-50">
                            <h4 className="text-sm font-semibold uppercase tracking-wide text-blue-600 flex items-center gap-2">Preseleccionados</h4>
                            <span className="text-slate-400">{preseleccionadosOpen ? '▲' : '▼'}</span>
                          </button>
                          {preseleccionadosOpen && (
                            <div className="border-t border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Sin candidatos preseleccionados.</div>
                          )}
                        </section>
                        <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                          <button onClick={() => setSeleccionadosOpen(!seleccionadosOpen)} className="flex w-full items-center justify-between p-4 hover:bg-slate-50">
                            <h4 className="text-sm font-semibold uppercase tracking-wide text-emerald-600 flex items-center gap-2">Seleccionados</h4>
                            <span className="text-slate-400">{seleccionadosOpen ? '▲' : '▼'}</span>
                          </button>
                          {seleccionadosOpen && (
                            <div className="border-t border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Sin candidatos seleccionados.</div>
                          )}
                        </section>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </article>
          )}

          {/* Soporte al Cliente */}
          {activePanel === 'soporte-cliente' && (
            <article className="scroll-mt-24 rounded-xl border border-blue-200 bg-white p-5 shadow-sm md:col-span-2 xl:col-span-3">
              <header className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-blue-950">Soporte al Cliente Externalizado</h2>
                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-900">Roberto Diaz</span>
              </header>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex justify-between"><span>Tickets abiertos</span><strong>286</strong></li>
              </ul>
              <section className="mt-6 grid gap-4 lg:grid-cols-2">
                <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-base font-semibold text-blue-950">Chatbot de Triaje</h3>
                  <div className="mt-3 h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 flex flex-col gap-2">
                     {chatMessages.map((msg, i) => (
                       <div key={i} className={`p-2 text-sm rounded ${msg.role === 'user' ? 'bg-blue-100 self-end' : 'bg-slate-100 self-start'}`}>{msg.text}</div>
                     ))}
                  </div>
                  <form onSubmit={handleChatSubmit} className="mt-3 flex gap-2">
                    <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} className="w-full rounded border border-blue-300 p-2 text-sm" placeholder="Escribe..." />
                    <button type="submit" className="bg-blue-900 text-white px-3 py-1 rounded text-sm">Enviar</button>
                  </form>
                </section>
                <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-base font-semibold text-blue-950">Panel de Agentes</h3>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="border border-slate-200 bg-white p-2 rounded"><div className="text-xs uppercase text-slate-500">Activos</div><div className="text-xl font-bold">0</div></div>
                    <div className="border border-slate-200 bg-white p-2 rounded"><div className="text-xs uppercase text-slate-500">Alta</div><div className="text-xl font-bold text-rose-700">0</div></div>
                    <div className="border border-slate-200 bg-white p-2 rounded"><div className="text-xs uppercase text-slate-500">Listos</div><div className="text-xl font-bold text-emerald-700">0</div></div>
                  </div>
                </section>
              </section>
            </article>
          )}

          {/* Otros Paneles Simples */}
          {activePanel === 'formacion-corporativa' && (
            <article className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-blue-950">Formacion Corporativa</h2>
              <p className="mt-2 text-sm text-slate-700">Catalogo en PDF, inscripciones manuales y escasa trazabilidad de progreso.</p>
            </article>
          )}
          
          {activePanel === 'ventas-desarrollo' && (
            <article className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-blue-950">Ventas y Desarrollo de Negocio</h2>
              <p className="mt-2 text-sm text-slate-700">Uso inconsistente del CRM y perdida de deals por seguimiento manual.</p>
            </article>
          )}

          {activePanel === 'marketing-comunicacion' && (
            <article className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-blue-950">Marketing y Comunicacion</h2>
              <p className="mt-2 text-sm text-slate-700">Web desactualizada, baja accesibilidad y poca visibilidad de conversion.</p>
            </article>
          )}

          {activePanel === 'recursos-humanos' && (
            <article className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-blue-950">Recursos Humanos</h2>
              <p className="mt-2 text-sm text-slate-700">Procesos internos por email y hojas de calculo, sin KPIs consolidados.</p>
            </article>
          )}

          {activePanel === 'tecnologia-infraestructura' && (
            <article className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-blue-950">Tecnologia e Infraestructura</h2>
              <p className="mt-2 text-sm text-slate-700">Stack desconectado, sin telemetria central y despliegues manuales.</p>
            </article>
          )}

          {activePanel === 'direccion-ejecutiva' && (
            <article className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-blue-950">Direccion Ejecutiva</h2>
              <p className="mt-2 text-sm text-slate-700">Decision estrategica basada en reportes manuales con una semana de retraso.</p>
            </article>
          )}
        </section>
      </main>
    </div>
  );
}
