"use client";

import { useState, useCallback } from "react";

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "Locations", href: "#locations" },
  { label: "Menu", href: "#menu" },
  { label: "Brasa Points", href: "#brasa-points" },
  { label: "Contact", href: "#contact" },
] as const;

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <header
      id="home"
      className="sticky top-0 z-20 border-b border-brasa-border/10 bg-brasa-brown-dark/95 text-brasa-cream"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        {/* Logo row + hamburger */}
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-oswald text-2xl uppercase tracking-widest">
            Brasaland
          </h2>

          {/* Hamburger button — visible on mobile only */}
          <button
            type="button"
            onClick={toggle}
            className="flex h-10 w-10 items-center justify-center rounded-md transition hover:bg-brasa-cream/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brasa-gold sm:hidden"
            aria-expanded={isOpen}
            aria-controls="mobile-nav"
            aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            <span className="sr-only">
              {isOpen ? "Close menu" : "Open menu"}
            </span>
            {/* Animated hamburger icon */}
            <span className="relative flex h-5 w-5 flex-col justify-center gap-[5px]">
              <span
                className={`hamburger-bar block h-[2px] w-5 rounded bg-current ${isOpen ? "translate-y-[1px] rotate-45" : ""}`}
              />
              <span
                className={`hamburger-bar block h-[2px] w-5 rounded bg-current ${isOpen ? "opacity-0" : ""}`}
              />
              <span
                className={`hamburger-bar block h-[2px] w-5 rounded bg-current ${isOpen ? "-translate-y-[1px] -rotate-45" : ""}`}
              />
            </span>
          </button>

          {/* Call Us CTA — mobile only */}
          <a
            href="#contact"
            className="rounded-full border border-brasa-cream/50 px-3 py-2 text-sm font-semibold uppercase tracking-wider transition hover:bg-brasa-cream hover:text-brasa-brown-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brasa-gold sm:hidden"
          >
            Call Us
          </a>
        </div>

        {/* Desktop nav */}
        <nav aria-label="Primary navigation" className="hidden sm:block">
          <ul className="flex items-center gap-3 text-sm font-semibold uppercase tracking-wide">
            {NAV_LINKS.map(({ label, href }) => (
              <li key={href}>
                <a
                  href={href}
                  className="inline-flex rounded-md px-2 py-1 transition hover:text-brasa-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brasa-gold"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Mobile nav — slides down */}
        <nav
          id="mobile-nav"
          aria-label="Mobile navigation"
          className={`mobile-menu sm:hidden ${isOpen ? "mobile-menu-open" : ""}`}
        >
          <ul className="flex flex-col gap-1 pb-2 text-sm font-semibold uppercase tracking-wide">
            {NAV_LINKS.map(({ label, href }) => (
              <li key={href}>
                <a
                  href={href}
                  onClick={close}
                  className="block rounded-md px-3 py-2 transition hover:bg-brasa-cream/10 hover:text-brasa-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brasa-gold"
                >
                  {label}
                </a>
              </li>
            ))}
            <li className="mt-2 border-t border-brasa-cream/15 pt-2">
              <a
                href="#contact"
                onClick={close}
                className="block rounded-full border border-brasa-cream/50 px-4 py-2 text-center text-sm font-semibold uppercase tracking-wider transition hover:bg-brasa-cream hover:text-brasa-brown-dark"
              >
                Call Us
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
