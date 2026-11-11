'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// --- Constantes y Utilidades ---
const TICKETS_STORAGE_KEY = 'nexova_support_tickets_v3';

type TranscriptRow = { role: string; text: string };
type Ticket = {
  ticket_id: string;
  fecha: string;
  cliente_info: { nombre: string; email: string };
  nivel_gravedad: string;
  resumen_problema: string;
  historial_transcripcion: TranscriptRow[];
  estado: string;
  asignado_a: string;
};

const seedTickets: Ticket[] = [
  {
    ticket_id: 'TK-240601',
    fecha: '2026-06-10 09:35',
    cliente_info: { nombre: 'RetailNova', email: 'soporte@retailnova.example.com' },
    nivel_gravedad: 'Alta',
    resumen_problema: 'Fallo crítico de sincronización del catálogo de productos con el CRM central.',
    historial_transcripcion: [
      { role: 'bot', text: 'Hola, soy Nexova Assist. Para comenzar, indicame el nombre de tu empresa.' },
      { role: 'user', text: 'RetailNova' },
      { role: 'bot', text: 'Describe brevemente la incidencia principal.' },
      { role: 'user', text: 'Desde la última actualización, la API de sincronización con nuestro CRM no actualiza.' },
    ],
    estado: 'Abierto',
    asignado_a: 'Sin asignar',
  },
  {
    ticket_id: 'TK-240602',
    fecha: '2026-06-11 14:20',
    cliente_info: { nombre: 'FinAxis Group', email: 'mesa@finaxis.example.com' },
    nivel_gravedad: 'Media',
    resumen_problema: 'Latencia elevada y timeouts intermitentes en el portal de acceso B2B.',
    historial_transcripcion: [],
    estado: 'Resuelto',
    asignado_a: 'Roberto Diaz',
  },
];

function severityClasses(level: string, status: string) {
  if (status === 'Resuelto') return 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40';
  if (level === 'Alta') return 'bg-rose-500/15 text-rose-300 border-rose-400/40';
  if (level === 'Media') return 'bg-amber-400/15 text-amber-200 border-amber-300/40';
  return 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40';
}

export default function TicketsAdminPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [replyInput, setReplyInput] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');

  // Cargar tickets desde localStorage
  useEffect(() => {
    const existing = localStorage.getItem(TICKETS_STORAGE_KEY);
    if (!existing) {
      localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(seedTickets));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTickets(seedTickets);
    } else {
      setTickets(JSON.parse(existing));
    }
  }, []);

  // Guardar tickets en localStorage cada vez que el estado cambie
  useEffect(() => {
    if (tickets.length > 0) {
      localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
    }
  }, [tickets]);

  // Metricas
  const activeCount = tickets.filter((t) => t.estado === 'Abierto').length;
  const highCount = tickets.filter((t) => t.estado === 'Abierto' && t.nivel_gravedad === 'Alta').length;
  const resolvedCount = tickets.filter((t) => t.estado === 'Resuelto').length;

  // Ordenacion
  const getWeight = (lvl: string) => (lvl === 'Alta' ? 3 : lvl === 'Media' ? 2 : 1);
  const sortedTickets = [...tickets].sort((a, b) => {
    if (sortOrder === 'desc') return getWeight(b.nivel_gravedad) - getWeight(a.nivel_gravedad);
    return getWeight(a.nivel_gravedad) - getWeight(b.nivel_gravedad);
  });

  const handleAssign = (ticketId: string, assignee: string) => {
    setTickets((prev) => prev.map((t) => (t.ticket_id === ticketId ? { ...t, asignado_a: assignee } : t)));
  };

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim() || !activeTicket) return;

    const updatedTicket = {
      ...activeTicket,
      historial_transcripcion: [...activeTicket.historial_transcripcion, { role: 'agent', text: replyInput }],
    };

    setTickets((prev) => prev.map((t) => (t.ticket_id === activeTicket.ticket_id ? updatedTicket : t)));
    setActiveTicket(updatedTicket);
    setReplyInput('');
  };

  const markAsResolved = () => {
    if (!activeTicket) return;
    const updatedTicket = { ...activeTicket, estado: 'Resuelto' };
    setTickets((prev) => prev.map((t) => (t.ticket_id === activeTicket.ticket_id ? updatedTicket : t)));
    setActiveTicket(updatedTicket);
  };

  return (
    <div className="text-slate-100 antialiased pb-16">
      <header className="rounded-2xl border border-emerald-500/25 bg-[#121721]/85 p-6 mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-400 font-semibold">
            Nexova / Escalado IT
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white">Panel de Agentes — Tickets Escalados</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold">
          <Link
            href="/support"
            className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-emerald-300 hover:bg-emerald-400 hover:text-[#0a0d12] transition"
          >
            Chatbot Soporte IA
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-emerald-500/20 bg-[#0a0d12]/60 px-4 py-2 text-slate-300 hover:text-white transition"
          >
            Inicio
          </Link>
        </div>
      </header>

      {/* Metricas */}
      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-emerald-500/20 bg-[#121721]/75 p-5 shadow-lg">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tickets Activos</h2>
          <p className="mt-2 text-3xl font-extrabold text-white">{activeCount}</p>
        </article>
        <article className="rounded-2xl border border-emerald-500/20 bg-[#121721]/75 p-5 shadow-lg">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Alta Prioridad</h2>
          <p className="mt-2 text-3xl font-extrabold text-rose-400">{highCount}</p>
        </article>
        <article className="rounded-2xl border border-emerald-500/20 bg-[#121721]/75 p-5 shadow-lg">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Resueltos</h2>
          <p className="mt-2 text-3xl font-extrabold text-emerald-400">{resolvedCount}</p>
        </article>
      </section>

      {/* Listado */}
      <section className="mt-6 rounded-2xl border border-emerald-500/20 bg-[#121721]/80 p-5 shadow-xl sm:p-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-white">Tickets en seguimiento</h2>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-400">Ordenar por:</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="rounded-xl border border-emerald-500/25 bg-[#0a0d12] px-3 py-1.5 text-xs font-semibold text-slate-200 focus:border-emerald-400 focus:outline-none"
            >
              <option value="desc">Mayor gravedad primero</option>
              <option value="asc">Menor gravedad primero</option>
            </select>
          </div>
        </header>

        <div className="mt-6 flex flex-col gap-3">
          {sortedTickets.map((ticket) => (
            <article
              key={ticket.ticket_id}
              className="rounded-xl border border-emerald-500/15 bg-[#181f2c]/80 p-4 hover:border-emerald-400/40 transition-colors"
            >
              <div className="w-full text-left flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div
                  className="flex items-center gap-4 sm:w-1/4 cursor-pointer"
                  onClick={() => setActiveTicket(ticket)}
                >
                  <div>
                    <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                      {ticket.ticket_id}
                    </p>
                    <h3 className="text-sm font-bold text-white leading-tight mt-0.5">
                      {ticket.cliente_info.nombre}
                    </h3>
                  </div>
                </div>

                <div className="sm:w-1/4 px-3">
                  <select
                    value={ticket.asignado_a}
                    onChange={(e) => handleAssign(ticket.ticket_id, e.target.value)}
                    className="w-full rounded-xl border border-emerald-500/25 bg-[#0a0d12] px-3 py-1.5 text-xs font-medium text-slate-200 focus:border-emerald-400 focus:outline-none"
                  >
                    <option value="Sin asignar">Sin asignar</option>
                    <option value="Roberto Diaz">Roberto Diaz</option>
                    <option value="Laura Mendoza">Laura Mendoza</option>
                  </select>
                </div>

                <div
                  className="flex-1 text-xs sm:text-sm text-slate-300 line-clamp-2 cursor-pointer"
                  onClick={() => setActiveTicket(ticket)}
                >
                  {ticket.resumen_problema}
                </div>

                <div
                  className="flex items-center justify-between sm:w-[180px] sm:justify-end gap-4 cursor-pointer"
                  onClick={() => setActiveTicket(ticket)}
                >
                  <p className="text-xs font-mono text-slate-400 whitespace-nowrap">
                    {ticket.fecha.split(' ')[0]}
                  </p>
                  <span
                    className={`inline-flex min-w-[75px] justify-center rounded-full border px-3 py-1 text-xs font-semibold ${severityClasses(
                      ticket.nivel_gravedad,
                      ticket.estado
                    )}`}
                  >
                    {ticket.nivel_gravedad}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Modal Detalle de Ticket */}
      {activeTicket && (
        <section className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center">
          <article className="w-full max-h-[90vh] max-w-3xl overflow-y-auto rounded-2xl border border-emerald-500/30 bg-[#121721] p-6 shadow-2xl">
            <header className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Detalle de ticket</p>
                <h2 className="mt-1 text-2xl font-bold text-white font-mono">{activeTicket.ticket_id}</h2>
              </div>
              <button
                onClick={() => setActiveTicket(null)}
                className="rounded-xl border border-emerald-500/30 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-emerald-500/15"
              >
                Cerrar
              </button>
            </header>

            <section className="mt-5 grid gap-4 rounded-xl border border-emerald-500/20 bg-[#0a0d12]/80 p-4 sm:grid-cols-2">
              <article>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cliente</h3>
                <p className="mt-1 text-sm font-bold text-white">{activeTicket.cliente_info.nombre}</p>
                <p className="text-xs text-slate-400">{activeTicket.cliente_info.email}</p>
              </article>
              <article>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Estado</h3>
                <div className="mt-1.5 flex items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${severityClasses(
                      activeTicket.nivel_gravedad,
                      activeTicket.estado
                    )}`}
                  >
                    {activeTicket.nivel_gravedad}
                  </span>
                  <span className="rounded-full border border-emerald-500/25 bg-[#121721] px-3 py-0.5 text-xs font-semibold text-slate-200">
                    {activeTicket.estado}
                  </span>
                </div>
              </article>
            </section>

            <section className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Resumen del problema</h3>
              <p className="mt-2 rounded-xl border border-emerald-500/15 bg-[#0a0d12]/80 p-3.5 text-sm text-slate-200">
                {activeTicket.resumen_problema}
              </p>
            </section>

            <section className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Historial de chat</h3>
              <div className="mt-2 max-h-48 overflow-y-auto flex flex-col gap-2 rounded-xl border border-emerald-500/15 bg-[#0a0d12]/80 p-3.5">
                {activeTicket.historial_transcripcion.length === 0 ? (
                  <p className="text-xs text-slate-500">Sin transcripción.</p>
                ) : (
                  activeTicket.historial_transcripcion.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-xl text-xs max-w-[80%] ${
                        msg.role === 'agent' || msg.role === 'bot'
                          ? 'bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 self-start'
                          : 'bg-[#181f2c] border border-slate-700 text-slate-200 self-end'
                      }`}
                    >
                      <strong>{msg.role === 'agent' ? 'Agente' : msg.role === 'bot' ? 'IA' : 'Cliente'}: </strong>{' '}
                      {msg.text}
                    </div>
                  ))
                )}
              </div>
            </section>

            {activeTicket.estado === 'Abierto' ? (
              <section className="mt-5 rounded-xl border border-emerald-500/20 bg-[#0a0d12]/60 p-4">
                <form onSubmit={handleReply} className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    placeholder="Responde al cliente..."
                    className="w-full rounded-xl border border-emerald-500/25 bg-[#0a0d12] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-emerald-400 text-[#0a0d12] px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-300 transition"
                  >
                    Responder
                  </button>
                  <button
                    type="button"
                    onClick={markAsResolved}
                    className="border border-emerald-400/40 bg-emerald-500/15 text-emerald-300 px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-500/25 transition"
                  >
                    Resolver
                  </button>
                </form>
              </section>
            ) : (
              <p className="mt-5 text-xs text-emerald-300 text-center font-semibold border border-emerald-500/20 p-3 rounded-xl bg-emerald-500/10">
                Ticket Cerrado.
              </p>
            )}
          </article>
        </section>
      )}
    </div>
  );
}
