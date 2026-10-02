import type { ReactNode } from "react";

interface CardProps {
  /** Card title */
  title: string;
  /** Card description */
  description?: string;
  /** Main card content */
  children?: ReactNode;
  /** Footer content */
  footer?: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Click handler - makes card clickable */
  onClick?: () => void;
}

/**
 * Card - Versatile card component for content display
 *
 * @accessibility
 * - Uses semantic <article> for standalone content
 * - Clickable card uses <button> wrapper for proper semantics
 * - Focus visible indicators for keyboard navigation
 * - Proper heading hierarchy
 *
 * @example
 * <Card title="Feature Name" description="Description text">
 *   <p>Additional content</p>
 * </Card>
 *
 * @example
 * // Clickable card
 * <Card title="Click me" onClick={() => navigate("/page")}>
 *   Content
 * </Card>
 */
export default function Card({
  title,
  description,
  children,
  footer,
  className = "",
  onClick,
}: CardProps) {
  const baseClasses = `
    overflow-hidden rounded-2xl border border-brasa-brown/10 bg-brasa-cream-light
    transition-shadow duration-200
    ${onClick ? "hover:shadow-md cursor-pointer" : "shadow-sm"}
    ${className}
  `;

  const content = (
    <>
      <div className="p-6">
        <h3 className="font-oswald text-2xl uppercase text-brasa-brown">
          {title}
        </h3>
        {description && (
          <p className="mt-3 text-sm leading-relaxed text-brasa-text-secondary">
            {description}
          </p>
        )}
        {children && <div className="mt-4">{children}</div>}
      </div>
      {footer && (
        <div className="border-t border-brasa-brown/10 bg-brasa-cream px-6 py-4">
          {footer}
        </div>
      )}
    </>
  );

  // If clickable, wrap in a button
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClasses} text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brasa-red`}
      >
        {content}
      </button>
    );
  }

  // Otherwise, use semantic article
  return (
    <article className={baseClasses}>
      {content}
    </article>
  );
}
