"use client";

import { EnquiryForm } from "@/components/application/EnquiryForm";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { useLanguage } from "@/components/LanguageProvider";

export default function ApplicationPage() {
  const { t } = useLanguage();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <section aria-labelledby="form-title">
          <h1 id="form-title" className="text-3xl font-bold text-slate-900 sm:text-4xl">
            {t.form.title}
          </h1>
          <p className="mt-3 text-slate-700">{t.form.intro}</p>
          <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
            {t.form.partnership}
          </p>
        </section>
        <div className="mt-8">
          <EnquiryForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
