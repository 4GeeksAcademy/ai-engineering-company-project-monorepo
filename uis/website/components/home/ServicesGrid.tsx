"use client";

import { useLanguage } from "@/components/LanguageProvider";

export function ServicesGrid() {
  const { t } = useLanguage();

  return (
    <section id="services" className="mx-auto max-w-6xl px-4 py-14" aria-labelledby="services-title">
      <h2 id="services-title" className="text-2xl font-bold text-slate-900 sm:text-3xl">
        {t.services.title}
      </h2>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {t.services.columns.map((column) => (
          <article key={column.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-teal-800">{column.title}</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
              {column.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
