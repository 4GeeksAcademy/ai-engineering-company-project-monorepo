# Component Generator Skill

Generate React/Next.js components with accessibility (WCAG 2.1 AA) and best practices built-in.

## Purpose

This skill creates production-ready React components that:
- Follow Next.js App Router conventions
- Meet WCAG 2.1 AA accessibility standards
- Use TypeScript with proper typing
- Include barrel exports via `index.tsx`

## File Structure

Each component follows this structure:

```
components/
└── ComponentName/
    ├── index.tsx           # Barrel export
    └── ComponentName.tsx   # Component implementation
```

## Component Template

### index.tsx

```tsx
export { default } from "./ComponentName";
```

### ComponentName.tsx

```tsx
"use client"; // Only if using hooks or client-side interactivity

import type { ReactNode } from "react";

interface ComponentNameProps {
  /** Description of the prop */
  children?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ComponentName - Brief description of what it does
 *
 * @accessibility
 * - Uses semantic HTML elements
 * - Includes proper ARIA attributes
 * - Supports keyboard navigation
 * - Has visible focus indicators
 *
 * @example
 * <ComponentName>Content here</ComponentName>
 */
export default function ComponentName({
  children,
  className = "",
}: ComponentNameProps) {
  return (
    <section
      className={className}
      aria-labelledby="componentname-heading"
    >
      <h2 id="componentname-heading" className="sr-only">
        Section Title
      </h2>
      {children}
    </section>
  );
}
```

## WCAG 2.1 AA Requirements

### Perceivable
- **1.1.1 Non-text Content**: All images need `alt` text; decorative images use `alt=""`
- **1.3.1 Info and Meaning**: Use semantic HTML (`<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`)
- **1.4.3 Contrast**: Minimum 4.5:1 for normal text, 3:1 for large text
- **1.4.11 Non-text Contrast**: UI components need 3:1 contrast ratio

### Operable
- **2.1.1 Keyboard**: All functionality available via keyboard
- **2.4.1 Bypass Blocks**: Provide skip links for navigation
- **2.4.3 Focus Order**: Logical tab order following visual layout
- **2.4.7 Focus Visible**: Visible focus indicators (use `focus-visible`)

### Understandable
- **3.1.1 Language of Page**: Set `lang` attribute on `<html>`
- **3.3.2 Labels**: All form inputs have visible labels

### Robust
- **4.1.2 Name, Role, Value**: Use ARIA attributes when semantic HTML isn't sufficient

## Accessibility Patterns

### Interactive Elements

```tsx
// Button with proper accessibility
<button
  type="button"
  onClick={handleClick}
  className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
  aria-label="Descriptive action"
>
  <span className="sr-only">Screen reader only text</span>
  Visible content
</button>
```

### Navigation

```tsx
// Semantic navigation
<nav aria-label="Main navigation">
  <ul role="list">
    <li>
      <a
        href="#section"
        className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        aria-current="page" // For active link
      >
        Link Text
      </a>
    </li>
  </ul>
</nav>
```

### Forms

```tsx
// Accessible form inputs
<div>
  <label htmlFor="email" className="block text-sm font-medium">
    Email Address <span aria-hidden="true">*</span>
    <span className="sr-only">(required)</span>
  </label>
  <input
    id="email"
    type="email"
    required
    aria-required="true"
    aria-invalid={hasError}
    aria-describedby={hasError ? "email-error" : undefined}
    className="mt-1 block w-full rounded-md border p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
  />
  {hasError && (
    <p id="email-error" role="alert" className="mt-1 text-sm text-red-600">
      Please enter a valid email address.
    </p>
  )}
</div>
```

### Modal/Dialog

```tsx
// Accessible modal
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <h2 id="dialog-title">Dialog Title</h2>
  <p id="dialog-description">Description text</p>
  <button
    type="button"
    aria-label="Close dialog"
    onClick={onClose}
  >
    ✕
  </button>
</div>
```

### Accordion/Expandable

```tsx
// Accessible accordion
<div>
  <h3>
    <button
      type="button"
      aria-expanded={isOpen}
      aria-controls="panel-1"
      id="header-1"
      className="flex w-full items-center justify-between p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      Section Title
      <span aria-hidden="true" className={isOpen ? "rotate-180" : ""}>
        ▼
      </span>
    </button>
  </h3>
  <div
    id="panel-1"
    role="region"
    aria-labelledby="header-1"
    hidden={!isOpen}
  >
    Expandable content here
  </div>
</div>
```

## Next.js Best Practices

### Client vs Server Components

```tsx
// Server Component (default) - No "use client" directive
// Good for: static content, data fetching, SEO
export default async function ServerComponent() {
  const data = await fetchData();
  return <div>{data.title}</div>;
}

// Client Component - Add "use client" at top
// Good for: interactivity, hooks, browser APIs
"use client";

import { useState } from "react";

export default function ClientComponent() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

### Component Composition

```tsx
// Prefer composition over props drilling
export default function ParentComponent() {
  return (
    <Layout>
      <Header />
      <Main>
        <Content />
      </Main>
      <Footer />
    </Layout>
  );
}
```

### Performance

```tsx
// Use dynamic imports for heavy components
import dynamic from "next/dynamic";

const HeavyChart = dynamic(() => import("./HeavyChart"), {
  loading: () => <p>Loading chart...</p>,
  ssr: false, // If client-only
});

// Use React.memo for expensive renders
const ExpensiveList = React.memo(function ExpensiveList({ items }: Props) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
});
```

### TypeScript Props

```tsx
// Use discriminated unions for variants
type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  variant: ButtonVariant;
  children: ReactNode;
  disabled?: boolean;
}

// Use Omit for extending HTML elements
interface CustomInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string;
  error?: string;
  size?: "sm" | "md" | "lg";
}
```

## Tailwind CSS Conventions

### Focus Styles

```tsx
// Always use focus-visible for keyboard-only focus
<button className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">

// Or use ring utilities
<button className="focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
```

### Responsive Design

```tsx
// Mobile-first approach
<div className="p-4 sm:p-6 lg:p-8">

// Responsive typography
<h1 className="text-2xl sm:text-3xl lg:text-4xl">
```

### Dark Mode

```tsx
// Use dark: prefix
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
```

## Example Component

See `/skills/component-generator/examples/Button.tsx` for a complete, accessible button component.
