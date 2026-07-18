# SKILL: React Component Generation (TypeScript + Tailwind)

## Objective
Generate a functional React component using TypeScript and Tailwind CSS that is reusable, readable, and aligned with monorepo standards.

## Inputs
- componentName: string
- props: object shape definition

## Process
1. Create a function component with explicit TypeScript props typing.
2. Declare a Props interface or type using the provided props input.
3. Implement JSX structure with semantic HTML when possible.
4. Style exclusively with Tailwind utility classes.
5. Export the component as default or named export according to local project conventions.

## Output template
- Component file containing:
  - Typed props definition
  - Functional component
  - Tailwind-only class usage

## Acceptance criteria
- The component must be fully typed with TypeScript.
- No custom CSS classes are allowed.
- Styling must use only Tailwind utility classes.
- The component must compile without TypeScript errors.
- Props contract must be clear and minimal.

## Example skeleton
```tsx
import React from "react";

type ComponentNameProps = {
  title: string;
  subtitle?: string;
};

export function ComponentName({ title, subtitle }: ComponentNameProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      {subtitle ? <p className="mt-2 text-sm text-slate-600">{subtitle}</p> : null}
    </section>
  );
}
```
