"use client";

import { clinics } from "@/lib/content";
import { useLanguage } from "@/components/LanguageProvider";

export function LocationsTable() {
  const { t } = useLanguage();

  return (
    <section id="locations" className="border-y border-slate-200 bg-white" aria-labelledby="locations-title">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <h2 id="locations-title" className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {t.locations.title}
        </h2>
        <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">{t.locations.clinic}</th>
                <th className="px-4 py-3">{t.locations.city}</th>
                <th className="px-4 py-3">{t.locations.state}</th>
                <th className="px-4 py-3">{t.locations.phone}</th>
                <th className="px-4 py-3">{t.locations.hours}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clinics.map((clinic) => (
                <tr key={clinic.name} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{clinic.name}</td>
                  <td className="px-4 py-3 text-slate-700">{clinic.city}</td>
                  <td className="px-4 py-3 text-slate-700">{clinic.state}</td>
                  <td className="px-4 py-3 text-slate-700">{clinic.phone}</td>
                  <td className="px-4 py-3 text-slate-700">{clinic.hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
