"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";

const SOCIAL_LINKS = [
  { label: "LinkedIn", href: "https://linkedin.com/company/healthcore" },
  { label: "Facebook", href: "https://facebook.com/healthcore" },
  { label: "Instagram", href: "https://instagram.com/healthcore" },
];

export function SiteFooter({ variant }: { variant: "home" | "form" }) {
  const { t } = useLanguage();

  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <Link className="brand brand-light" href={variant === "home" ? "#hero" : "/"}>
          <Image src="/assets/logo.svg" alt="" width={38} height={38} unoptimized />
          <span>HealthCore</span>
        </Link>
        <p>{t("footer.copy")}</p>
        <div className="social-links">
          {SOCIAL_LINKS.map((link) => (
            <a key={link.label} href={link.href}>
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
