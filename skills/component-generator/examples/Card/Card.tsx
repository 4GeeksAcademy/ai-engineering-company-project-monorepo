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
  /** Image URL */
  image?: string;
  /** Image alt text - required when image is provided */
  imageAlt?: string;
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
 * - Clickable card uses <a> or <button> wrapper for proper semantics
 * - Image has alt text for screen readers
 * - Focus visible indicators for keyboard navigation
 *
 * @example
 * <Card
 *   title="Feature Name"
 *   description="Description text"
 *   image="/path/to/image.jpg"
 *   imageAlt="Description of the image"
 * >
 *   <p>Additional content</p>
 * </Card>
 *
 * @example
 * // Clickable card
 * <Card
 *   title="Click me"
 *   onClick={() => navigate("/page")}
 *   footer={<Button>Learn more</Button>}
 * />
 */
export default function Card({
  title,
  description,
  children,
  footer,
  image,
  imageAlt,
  className = "",
  onClick,
}: CardProps) {
  const baseClasses = `
    overflow-hidden rounded-lg border border-gray-200 bg-white
    shadow-sm transition-shadow duration-200
    dark:border-gray-700 dark:bg-gray-800
    ${onClick ? "hover:shadow-md cursor-pointer" : ""}
    ${className}
  `;

  const content = (
    <>
      {image && (
        <div className="aspect-video overflow-hidden bg-gray-100 dark:bg-gray-700">
          <img
            src={image}
            alt={imageAlt || ""}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {description}
          </p>
        )}
        {children && <div className="mt-4">{children}</div>}
      </div>
      {footer && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-700/50">
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
        className={`${baseClasses} text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600`}
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
