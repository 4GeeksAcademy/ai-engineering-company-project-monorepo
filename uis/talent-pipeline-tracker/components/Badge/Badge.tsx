import type { ReactNode } from "react";

export interface BadgeProps {
  label: string;
  shortLabel?: string;
  title?: string;
  className?: string;
  /** Max width class to apply truncation */
  maxWidthClass?: string;
  children?: ReactNode;
}

export default function Badge({
  label,
  shortLabel,
  title,
  className = "",
  maxWidthClass = "max-w-[7rem]",
  children,
}: BadgeProps) {
  const display = shortLabel ?? label;
  return (
    <span
      title={title ?? label}
      className={`inline-flex ${maxWidthClass} cursor-help overflow-hidden whitespace-nowrap text-ellipsis rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {children ?? display}
    </span>
  );
}