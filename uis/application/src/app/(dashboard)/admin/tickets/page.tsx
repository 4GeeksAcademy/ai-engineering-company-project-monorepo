'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// --- Constantes y Utilidades ---
const TICKETS_STORAGE_KEY = "nexova_support_tickets_v3";

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
        ticket_id: "TK-240601",
        fecha: "2026-06-10 09:35",
        cliente_info: { nombre: "RetailNova", email: "soporte@retailnova.example.com" },
        nivel_gravedad: "Alta",
        resumen_problema: "Fallo crítico de sincronización del catálogo de productos con el CRM central.",
        historial_transcripcion: [
            { role: "bot", text: "Hola, soy Nexova Assist. Para comenzar, indicame el nombre de tu empresa." },
            { role: "user", text: "RetailNova" },
            { role: "bot", text: "Describe brevemente la incidencia principal." },
            { role: "user", text: "Desde la última actualización, la API de sincronización con nuestro CRM no actualiza." }
        ],
        estado: "Abierto",
        asignado_a: "Sin asignar"
    },
    {
        ticket_id: "TK-240602",
        fecha: "2026-06-11 14:20",
        cliente_info: { nombre: "FinAxis Group", email: "mesa@finaxis.example.com" },
        nivel_gravedad: "Media",
        resumen_problema: "Latencia elevada y timeouts intermitentes en el portal de acceso B2B.",
        historial_transcripcion: [],
        estado: "Resuelto",
        asignado_a: "Roberto Diaz"
    }
];

function severityClasses(level: string, status: string) {
    if (status === "Resuelto") return "bg-emerald-100 text-emerald-800 border-emerald-300";
    if (level === "Alta") return "bg-rose-100 text-rose-800 border-rose-300";
    if (level === "Media") return "bg-amber-100 text-amber-800 border-amber-300";
    return "bg-emerald-100 text-emerald-800 border-emerald-300";
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
    const activeCount = tickets.filter(t => t.estado === "Abierto").length;
    const highCount = tickets.filter(t => t.estado === "Abierto" && t.nivel_gravedad === "Alta").length;
    const resolvedCount = tickets.filter(t => t.estado === "Resuelto").length;

    // Ordenacion
    const getWeight = (lvl: string) => lvl === "Alta" ? 3 : lvl === "Media" ? 2 : 1;
    const sortedTickets = [...tickets].sort((a, b) => {
        if (sortOrder === 'desc') return getWeight(b.nivel_gravedad) - getWeight(a.nivel_gravedad);
        return getWeight(a.nivel_gravedad) - getWeight(b.nivel_gravedad);
    });

    const handleAssign = (ticketId: string, assignee: string) => {
        setTickets(prev => prev.map(t => t.ticket_id === ticketId ? { ...t, asignado_a: assignee } : t));
    };

    const handleReply = (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyInput.trim() || !activeTicket) return;

        const updatedTicket = {
            ...activeTicket,
            historial_transcripcion: [...activeTicket.historial_transcripcion, { role: 'agent', text: replyInput }]
        };

        setTickets(prev => prev.map(t => t.ticket_id === activeTicket.ticket_id ? updatedTicket : t));
        setActiveTicket(updatedTicket);
        setReplyInput('');
    };

    const markAsResolved = () => {
        if (!activeTicket) return;
        const updatedTicket = { ...activeTicket, estado: 'Resuelto' };
        setTickets(prev => prev.map(t => t.ticket_id === activeTicket.ticket_id ? updatedTicket : t));
        setActiveTicket(updatedTicket);
    };

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900 antialiased pb-20">
            <header className="border-b border-blue-900 bg-blue-950 text-white">
                <section className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-blue-200">Nexova / Admin</p>
                        <h1 className="text-2xl font-bold">Panel de Agentes - Tickets Escalados</h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Link href="/support" className="rounded-md border border-blue-300 px-3 py-2 text-blue-100 hover:bg-blue-900">Chatbot soporte</Link>
                        <Link href="/" className="rounded-md border border-blue-300 px-3 py-2 text-blue-100 hover:bg-blue-900">Inicio</Link>
                    </div>
                </section>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Metricas */}
                <section className="grid gap-4 sm:grid-cols-3">
                    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <h2 className="text-sm font-semibold text-slate-600">Tickets activos</h2>
                        <p className="mt-2 text-3xl font-bold text-blue-950">{activeCount}</p>
                    </article>
                    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <h2 className="text-sm font-semibold text-slate-600">Alta prioridad</h2>
                        <p className="mt-2 text-3xl font-bold text-rose-700">{highCount}</p>
                    </article>
                    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <h2 className="text-sm font-semibold text-slate-600">Resueltos</h2>
                        <p className="mt-2 text-3xl font-bold text-emerald-700">{resolvedCount}</p>
                    </article>
                </section>

                {/* Listado */}
                <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-lg font-semibold text-blue-950">Tickets en seguimiento</h2>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-slate-600">Ordenar por:</label>
                            <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                                <option value="desc">Mayor gravedad primero</option>
                                <option value="asc">Menor gravedad primero</option>
                            </select>
                        </div>
                    </header>

                    <div className="mt-6 flex flex-col gap-3">
                        {sortedTickets.map(ticket => (
                            <article key={ticket.ticket_id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:border-blue-300 transition-colors">
                                <div className="w-full text-left flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-4 sm:w-1/4 cursor-pointer" onClick={() => setActiveTicket(ticket)}>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">{ticket.ticket_id}</p>
                                            <h3 className="text-sm font-semibold text-slate-900 leading-tight mt-0.5">{ticket.cliente_info.nombre}</h3>
                                        </div>
                                    </div>

                                    <div className="sm:w-1/4 px-3">
                                        <select
                                            value={ticket.asignado_a}
                                            onChange={e => handleAssign(ticket.ticket_id, e.target.value)}
                                            className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
                                        >
                                            <option value="Sin asignar">Sin asignar</option>
                                            <option value="Roberto Diaz">Roberto Diaz</option>
                                            <option value="Laura Mendoza">Laura Mendoza</option>
                                        </select>
                                    </div>

                                    <div className="flex-1 text-sm text-slate-600 line-clamp-2 cursor-pointer" onClick={() => setActiveTicket(ticket)}>
                                        {ticket.resumen_problema}
                                    </div>

                                    <div className="flex items-center justify-between sm:w-[180px] sm:justify-end gap-4 cursor-pointer" onClick={() => setActiveTicket(ticket)}>
                                        <p className="text-xs text-slate-500 whitespace-nowrap">{ticket.fecha.split(" ")[0]}</p>
                                        <span className={`inline-flex min-w-[75px] justify-center rounded-full px-3 py-1 text-xs font-semibold ${severityClasses(ticket.nivel_gravedad, ticket.estado)}`}>
                                            {ticket.nivel_gravedad}
                                        </span>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            </main>

            {/* Modal Detalle de Ticket */}
            {activeTicket && (
                <section className="fixed inset-0 z-40 bg-slate-900/50 p-4 sm:p-6 flex items-center justify-center">
                    <article className="w-full max-h-[90vh] max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
                        <header className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Detalle de ticket</p>
                                <h2 className="mt-1 text-2xl font-bold text-blue-950">{activeTicket.ticket_id}</h2>
                            </div>
                            <button onClick={() => setActiveTicket(null)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                                Cerrar
                            </button>
                        </header>

                        <section className="mt-5 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                            <article>
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Cliente</h3>
                                <p className="mt-1 text-sm font-semibold text-slate-900">{activeTicket.cliente_info.nombre}</p>
                                <p className="text-sm text-slate-700">{activeTicket.cliente_info.email}</p>
                            </article>
                            <article>
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Estado</h3>
                                <div className="mt-1 flex items-center gap-2">
                                    <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${severityClasses(activeTicket.nivel_gravedad, activeTicket.estado)}`}>{activeTicket.nivel_gravedad}</span>
                                    <span className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700">{activeTicket.estado}</span>
                                </div>
                            </article>
                        </section>

                        <section className="mt-5">
                            <h3 className="text-sm font-semibold text-blue-950">Resumen del problema</h3>
                            <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{activeTicket.resumen_problema}</p>
                        </section>

                        <section className="mt-5">
                            <h3 className="text-sm font-semibold text-blue-950">Historial de chat</h3>
                            <div className="mt-2 max-h-48 overflow-y-auto flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                                {activeTicket.historial_transcripcion.length === 0 ? (
                                    <p className="text-sm text-slate-500">Sin transcripción.</p>
                                ) : (
                                    activeTicket.historial_transcripcion.map((msg, i) => (
                                        <div key={i} className={`p-2 rounded text-sm max-w-[80%] ${msg.role === 'agent' || msg.role === 'bot' ? 'bg-blue-100 text-blue-900 self-start' : 'bg-white border text-slate-700 self-end'}`}>
                                            <strong>{msg.role === 'agent' ? 'Agente' : msg.role === 'bot' ? 'IA' : 'Cliente'}: </strong> {msg.text}
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        {activeTicket.estado === 'Abierto' ? (
                            <section className="mt-5 rounded-md border border-blue-200 bg-blue-50 p-4">
                                <form onSubmit={handleReply} className="flex flex-col gap-2 sm:flex-row">
                                    <input type="text" value={replyInput} onChange={e => setReplyInput(e.target.value)} placeholder="Responde al cliente..." className="w-full rounded border px-3 py-2 text-sm" />
                                    <button type="submit" className="bg-blue-900 text-white px-4 py-2 rounded text-sm font-semibold">Responder</button>
                                    <button type="button" onClick={markAsResolved} className="bg-emerald-600 text-white px-4 py-2 rounded text-sm font-semibold">Resolver</button>
                                </form>
                            </section>
                        ) : (
                            <p className="mt-5 text-sm text-slate-500 text-center font-semibold border border-slate-200 p-3 rounded-md bg-slate-50">Ticket Cerrado.</p>
                        )}
                    </article>
                </section>
            )}
        </div>
    );
}
