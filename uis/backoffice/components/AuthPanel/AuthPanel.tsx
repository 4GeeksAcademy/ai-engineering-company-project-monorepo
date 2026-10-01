import { Flame } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface AuthPanelProps {
  title: string;
  description: string;
  alternateText: string;
  alternateLabel: string;
  alternateHref: string;
  children: ReactNode;
}

export default function AuthPanel({
  title,
  description,
  alternateText,
  alternateLabel,
  alternateHref,
  children,
}: AuthPanelProps) {
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#faf6f1_0%,#ffffff_52%,#f8ece8_100%)] px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8">
        <Link
          href="/login"
          className="flex w-fit items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brasa-red focus-visible:ring-offset-2"
        >
          <span className="flex size-10 items-center justify-center rounded-lg bg-brasa-red text-white shadow-sm">
            <Flame aria-hidden="true" className="size-5" strokeWidth={2.25} />
          </span>
          <span>
            <span className="block text-sm font-bold text-gray-950">Brasaland</span>
            <span className="block text-xs text-gray-500">Backoffice</span>
          </span>
        </Link>

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-gray-950">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
          </header>

          {children}

          <p className="mt-6 border-t border-gray-100 pt-5 text-center text-sm text-gray-600">
            {alternateText}{" "}
            <Link
              href={alternateHref}
              className="font-semibold text-brasa-red outline-none hover:text-brasa-red-dark hover:underline focus-visible:ring-2 focus-visible:ring-brasa-red focus-visible:ring-offset-2"
            >
              {alternateLabel}
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}