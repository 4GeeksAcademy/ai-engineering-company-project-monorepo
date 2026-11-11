'use client';
import React, { useState } from 'react';
import Link from 'next/link';

export default function SupportPage() {
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessages = [...messages, { role: 'user', text: input }];
    setMessages(newMessages);
    setInput('');
    setStatus('Enrutando consulta por el grafo de soporte...');

    setTimeout(() => {
      setStatus('');
      setMessages([
        ...newMessages,
        {
          role: 'bot',
          text: 'He registrado tu incidencia en tiempo real. Estoy escalando este ticket a un agente especialista para su resolución prioritaria.',
        },
      ]);
      setIsSuccess(true);
    }, 1200);
  };

  return (
    <div className="text-slate-100 antialiased">
      <div className="mx-auto max-w-4xl">
        <section className="rounded-2xl border border-emerald-500/25 bg-[#121721]/85 p-6 shadow-2xl backdrop-blur-xl">
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-emerald-500/15 pb-5">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
                Asistente Inteligente · LangGraph Triaje
              </span>
              <h1 className="mt-1 text-2xl font-bold text-white">
                Atención al Cliente y Triaje Inteligente
              </h1>
              <p className="mt-1 text-xs text-slate-300">
                El asistente realiza filtrado inicial, consulta herramientas operativas y escala automáticamente a ticket para agentes.
              </p>
            </div>
            <Link
              href="/admin/tickets"
              className="inline-flex items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-400 hover:text-[#0a0d12] transition"
            >
              Panel de Tickets →
            </Link>
          </header>

          <section className="mt-6 rounded-xl border border-emerald-500/20 bg-[#0a0d12]/90 overflow-hidden">
            <div
              className="h-[380px] overflow-y-auto p-5 flex flex-col gap-3.5"
              aria-live="polite"
              aria-label="Conversación de soporte"
            >
              {messages.length === 0 && (
                <div className="text-center text-slate-500 mt-16 text-xs font-mono">
                  [READY] Escribe tu consulta o número de incidencia para comenzar el triaje...
                </div>
              )}
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl text-xs sm:text-sm max-w-[80%] ${
                    msg.role === 'user'
                      ? 'bg-emerald-400 text-[#0a0d12] font-medium self-end'
                      : 'bg-[#181f2c] border border-emerald-500/25 text-slate-200 self-start'
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            {status && (
              <p className="px-5 pb-2 text-xs font-mono text-emerald-400 animate-pulse" aria-live="polite">
                {status}
              </p>
            )}

            <form onSubmit={handleSubmit} className="border-t border-emerald-500/15 bg-[#121721] p-4">
              <label htmlFor="chatInput" className="sr-only">
                Escribe tu mensaje
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="chatInput"
                  type="text"
                  required
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Describe tu incidencia o consulta el estado de un ticket..."
                  className="w-full rounded-xl border border-emerald-500/25 bg-[#0a0d12] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/25"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-400 px-6 py-2.5 text-xs font-bold text-[#0a0d12] shadow-[0_0_20px_rgba(16,185,129,0.3)] transition hover:bg-emerald-300"
                >
                  Enviar
                </button>
              </div>
            </form>

            {isSuccess && (
              <section
                className="border-t border-emerald-400/30 bg-emerald-500/10 px-5 py-4"
                aria-live="polite"
              >
                <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  ✓ Ticket escalado correctamente
                </h2>
                <p className="mt-1 text-xs text-slate-300">
                  Un agente especialista revisará el contexto de tu caso.
                </p>
                <Link
                  href="/admin/tickets"
                  className="mt-3 inline-flex rounded-lg border border-emerald-400/40 bg-[#0a0d12] px-3.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-400 hover:text-[#0a0d12] transition"
                >
                  Ver panel de agentes →
                </Link>
              </section>
            )}
          </section>
        </section>
      </div>
    </div>
  );
}
