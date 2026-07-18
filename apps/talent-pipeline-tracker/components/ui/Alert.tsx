import type { ReactNode } from 'react';

interface AlertProps {
  variant: 'success' | 'error';
  title?: string;
  children: ReactNode;
}

const variantClasses: Record<AlertProps['variant'], string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-rose-200 bg-rose-50 text-rose-900',
};

export function Alert({ variant, title, children }: AlertProps) {
  return (
    <div
      className={`rounded-md border px-4 py-3 text-sm shadow-sm ${variantClasses[variant]}`}
      role="alert"
      aria-live="polite"
    >
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      <div>{children}</div>
    </div>
  );
}
