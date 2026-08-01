interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const sizeClasses: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-4',
};

export function Spinner({ size = 'md', label = 'Cargando...' }: SpinnerProps) {
  return (
    <div className="inline-flex items-center gap-2" role="status" aria-live="polite" aria-label={label}>
      <span
        className={`inline-block animate-spin rounded-full border-slate-300 border-t-sky-600 ${sizeClasses[size]}`}
      />
      <span className="text-sm text-slate-600">{label}</span>
    </div>
  );
}
