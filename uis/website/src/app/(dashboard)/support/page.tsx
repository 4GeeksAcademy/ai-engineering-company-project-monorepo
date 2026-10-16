'use client'
import React, { useState } from 'react';
import Link from 'next/link';

export default function SupportPage() {
  const [messages, setMessages] = useState<{role: string, text: string}[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Agregar mensaje del usuario
    const newMessages = [...messages, { role: 'user', text: input }];
    setMessages(newMessages);
    setInput('');
    setStatus('Escribiendo...');

    // Simulacion de respuesta del bot
    setTimeout(() => {
      setStatus('');
      setMessages([...newMessages, { 
        role: 'bot', 
        text: 'He registrado tu incidencia. Estoy escalando este ticket a un agente humano para que lo revise lo antes posible.' 
      }]);
      setIsSuccess(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 antialiased">
      <header className="border-b border-blue-200 bg-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8" aria-label="Navegacion principal">
          <Link href="/" className="text-lg font-semibold tracking-wide text-blue-900">
            Nexova Solutions
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/" className="rounded-md px-3 py-2 text-blue-900 hover:bg-blue-100">Inicio</Link>
            <Link href="/admin/tickets" className="rounded-md px-3 py-2 text-blue-900 hover:bg-blue-100">Panel de tickets</Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm sm:p-6">
          <header>
            <h1 className="text-2xl font-bold text-blue-950">Atencion al Cliente y Triaje Inteligente</h1>
            <p className="mt-2 text-sm text-slate-700">
              El asistente realiza filtrado inicial, intenta resolver y, si es necesario, escala automaticamente a ticket para agentes.
            </p>
          </header>

          <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50">
            <div className="h-[420px] overflow-y-auto p-4 flex flex-col gap-4" aria-live="polite" aria-label="Conversacion de soporte">
              {messages.length === 0 && (
                <div className="text-center text-slate-500 mt-10">
                  Escribe tu consulta para comenzar el triaje...
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`p-3 rounded-lg max-w-[80%] ${msg.role === 'user' ? 'bg-blue-100 text-blue-900 self-end' : 'bg-white border border-slate-200 text-slate-800 self-start'}`}>
                  {msg.text}
                </div>
              ))}
            </div>

            <p className="px-4 pb-2 text-xs font-medium text-blue-700" aria-live="polite">{status}</p>

            <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-3 sm:p-4 rounded-b-xl">
              <label htmlFor="chatInput" className="sr-only">Escribe tu mensaje</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="chatInput"
                  type="text"
                  required
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Describe tu incidencia..."
                  className="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  Enviar
                </button>
              </div>
            </form>

            {isSuccess && (
              <section className="border-t border-emerald-200 bg-emerald-50 px-4 py-4 rounded-b-xl mt-2" aria-live="polite">
                <h2 className="text-sm font-semibold text-emerald-800">Ticket escalado correctamente</h2>
                <p className="mt-1 text-sm text-emerald-700">Un agente se pondrá en contacto contigo pronto.</p>
                <Link href="/admin/tickets" className="mt-3 inline-flex rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100">
                  Ver panel de agentes
                </Link>
              </section>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}
