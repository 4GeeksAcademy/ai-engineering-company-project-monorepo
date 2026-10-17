import type { ReactNode } from "react";
import { Check } from "lucide-react";

/** Cyan eyebrow + title that opens each section (and the page title of /talento, which passes `as="h1"`). */
export function SectionHeading({ eyebrow, title, as: Heading = "h2" }: { eyebrow: string; title: string; as?: "h1" | "h2" }) {
  return (
    <>
      <p className="font-semibold text-cyan-400">{eyebrow}</p>
      <Heading className="mt-3 text-4xl font-bold text-white">{title}</Heading>
    </>
  );
}

/** A list item with the cyan check mark. `compact` is the smaller mark used inside the service cards. */
export function CheckItem({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <li>
      <Check className={`${compact ? "mr-2" : "mr-3"} inline text-cyan-400`} size={compact ? 18 : undefined} aria-hidden="true" />
      {children}
    </li>
  );
}

/** Link inside running text. */
export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="text-cyan-300" href={href}>
      {children}
    </a>
  );
}
