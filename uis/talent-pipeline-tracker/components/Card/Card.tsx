import type { ReactNode } from "react";

export interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function Card({ title, children, className = "" }: CardProps) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm ${className}`}
    >
      {title ? (
        <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">
          {title}
        </div>
      ) : null}
      {children}
    </div>
  );
}