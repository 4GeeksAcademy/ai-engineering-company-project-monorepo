"use client";

import { useLanguage } from "@/components/LanguageProvider";

export function SiteFooter() {
  const { t } = useLanguage();

  return (
    <footer className="bg-slate-900 text-slate-300" role="contentinfo">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">{t.footer.rights}</p>
        <div className="flex gap-4 text-sm">
          <a href="https://linkedin.com/company/healthcore" className="hover:text-white">
            {t.footer.linkedin}
          </a>
          <a href="https://facebook.com/healthcore" className="hover:text-white">
            {t.footer.facebook}
          </a>
          <a href="https://instagram.com/healthcore" className="hover:text-white">
            {t.footer.instagram}
          </a>
        </div>
      </div>
    </footer>
  );
}
