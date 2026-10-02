import type { ReactNode } from "react";

export interface InfoRowProps {
  label: string;
  children: ReactNode;
}

export default function InfoRow({ label, children }: InfoRowProps) {
  return (
    <div className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[180px_1fr]">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="min-w-0 text-zinc-900">{children}</dd>
    </div>
  );
}