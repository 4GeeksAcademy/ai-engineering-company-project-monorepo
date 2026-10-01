"use client";

import { FormEvent, useState } from "react";

export default function KnowledgePage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setAnswer("");
    try {
      const response = await fetch("/knowledge/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? "No fue posible consultar la base de conocimiento.");
      setAnswer(data.answer);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 md:px-8">
      <section className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-sm md:p-10">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Knowledge Base</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Asistente comercial de TrackFlow</h1>
        <p className="mt-3 text-slate-600">Consulta políticas operativas respaldadas por la documentación oficial.</p>
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-slate-800" htmlFor="question">Pregunta</label>
          <textarea id="question" required minLength={3} value={question} onChange={(event) => setQuestion(event.target.value)} className="min-h-28 w-full rounded-xl border border-slate-300 p-3 text-slate-900 outline-none focus:border-indigo-500" placeholder="¿Cuál es el plazo estándar de entrega?" />
          <button disabled={loading} className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:cursor-wait disabled:opacity-60" type="submit">
            {loading ? "Consultando…" : "Consultar"}
          </button>
        </form>
        {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
        {answer && <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-slate-800"><h2 className="font-semibold text-emerald-900">Respuesta</h2><p className="mt-2 whitespace-pre-wrap">{answer}</p></div>}
      </section>
    </main>
  );
}
