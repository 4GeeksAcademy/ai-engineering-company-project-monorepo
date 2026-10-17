import type { HTMLInputTypeAttribute, ReactNode } from "react";

import type { AsyncFeedback } from "@/types/tracker";

export function FeedbackBanner({
  feedback,
  className = "",
}: {
  feedback: AsyncFeedback;
  className?: string;
}) {
  const palette = {
    loading: "border-sky-200 bg-sky-50 text-sky-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-rose-200 bg-rose-50 text-rose-700",
  }[feedback.tone];

  return (
    <p className={`rounded-2xl border px-4 py-3 text-sm ${palette} ${className}`.trim()}>
      {feedback.message}
    </p>
  );
}

export function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 break-words text-sm leading-6 text-slate-800">{value}</p>
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: HTMLInputTypeAttribute;
  step?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </span>
      <input
        type={type}
        step={step}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border bg-surface px-4 py-3 text-sm outline-none"
      />
    </label>
  );
}

export function PanelCard({ children }: { children: ReactNode }) {
  return <div className="rounded-[1.8rem] border bg-white/90 p-5">{children}</div>;
}

export function PageSkeleton() {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-border bg-surface-strong shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="h-40 animate-pulse border-b border-border bg-white/70" />
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
            <div className="space-y-3 px-6 py-6 lg:px-8">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-28 animate-pulse rounded-3xl border bg-white/70" />
              ))}
            </div>
            <div className="space-y-4 px-6 py-6 lg:px-8">
              <div className="h-12 animate-pulse rounded-2xl bg-white/70" />
              <div className="h-48 animate-pulse rounded-3xl bg-white/70" />
              <div className="h-56 animate-pulse rounded-3xl bg-white/70" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}