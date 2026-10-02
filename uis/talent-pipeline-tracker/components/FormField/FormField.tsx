import type { InputHTMLAttributes, ReactNode } from "react";

export interface FormFieldProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
}

export default function FormField({
  label,
  required,
  error,
  className = "",
  ...inputProps
}: FormFieldProps) {
  const hasError = Boolean(error);
  const fieldClass = `w-full rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 ${
    hasError
      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200"
      : "border-zinc-300 focus:border-indigo-500 focus:ring-indigo-200"
  }`;

  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className}`}>
      <span className="font-medium text-zinc-700">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      <input
        {...inputProps}
        aria-invalid={hasError || undefined}
        className={fieldClass}
      />
      {error ? (
        <span className="text-xs text-rose-600" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}