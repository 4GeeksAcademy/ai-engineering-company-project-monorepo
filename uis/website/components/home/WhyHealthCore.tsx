"use client";

import { useLanguage } from "@/components/LanguageProvider";

export function WhyHealthCore() {
  const { t } = useLanguage();

  return (
    <section className="mx-auto max-w-6xl px-4 pb-14" aria-labelledby="benefits-title">
      <h2 id="benefits-title" className="text-2xl font-bold text-slate-900 sm:text-3xl">
        {t.benefits.title}
      </h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {t.benefits.items.map((item) => (
          <div key={item} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-teal-600" aria-hidden="true" />
            <p className="text-slate-700">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
