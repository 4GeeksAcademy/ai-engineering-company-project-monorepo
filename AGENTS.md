# AGENTS.md

## Project Overview

This project is a **Next.js** application.

All contributors and AI agents working on this repository must follow the conventions and requirements described in this document.

## Package Manager

This project uses **pnpm** exclusively.

* Use `pnpm install` to install dependencies.
* Use `pnpm add` to add dependencies.
* Use `pnpm remove` to remove dependencies.
* Use `pnpm <script>` to run package scripts.
* Do **not** use `npm`, `yarn`, or other package managers.
* Do not create or modify `package-lock.json` or `yarn.lock`.
* Keep `pnpm-lock.yaml` up to date when dependencies change.

## Next.js

Follow **Next.js best practices** and the conventions already established in the repository.

* Prefer framework-native Next.js features where appropriate.
* Respect the existing project structure and architecture.
* Prefer Server Components when client-side behavior is not required.
* Only use `"use client"` when necessary.
* Avoid unnecessary client-side JavaScript.
* Optimize images, fonts, scripts, and other assets using the appropriate Next.js APIs.
* Keep components focused, reusable, and maintainable.

## Component Structure

Every component must live in its own directory and must expose its main component through an `index.ts` file.

The component implementation should **not** be imported directly from outside its directory. Consumers should import the component through the directory's public entry point.

Preferred structure:

```text
components/
└── Button/
    ├── Button.tsx
    ├── Button.test.tsx
    ├── Button.module.css
    └── index.ts
```

The `index.ts` file should expose the main component:

```ts
export { default } from "./Button";
```

Or, when named exports are used:

```ts
export { Button } from "./Button";
```

Consumers should import:

```ts
import Button from "@/components/Button";
```

Instead of:

```ts
import Button from "@/components/Button/Button";
```

Additional public types, utilities, or subcomponents may also be exported from `index.ts` when they are intentionally part of the component's public API.

Internal implementation details should **not** be exported unless they are intended to be consumed outside the component directory.

## Mobile First

The application must be developed using a **mobile-first approach**.

* Design and implement the smallest viewport first.
* Enhance layouts progressively for tablets and desktop screens.
* Avoid desktop-first CSS that is later overridden for mobile.
* Interfaces must remain usable and readable across different screen sizes.
* Interactive elements must be comfortable to use on touch devices.
* Avoid unnecessary fixed dimensions that could cause overflow or responsiveness issues.

## Accessibility

**Accessibility is a core requirement, not an optional improvement.**

All new features and changes must consider accessibility from the beginning.

* Use semantic HTML whenever possible.
* Maintain a logical heading hierarchy.
* All interactive elements must be keyboard accessible.
* Provide visible and appropriate focus states.
* Images must have meaningful `alt` text when appropriate.
* Form controls must have accessible labels.
* Use ARIA attributes only when native HTML semantics are insufficient.
* Do not rely exclusively on color to communicate information.
* Maintain sufficient color contrast.
* Ensure dialogs, menus, dropdowns, and other interactive UI elements have appropriate focus management.
* Consider screen-reader users when designing interactions.

Prefer native accessible HTML elements over recreating their behavior with generic elements.

## SEO

**SEO is a high priority for this project.**

Pages and components must be implemented with search-engine discoverability in mind.

* Use semantic HTML and a clear document structure.
* Use the Next.js Metadata API where appropriate.
* Provide meaningful page titles and descriptions.
* Use appropriate heading structures (`h1`, `h2`, etc.).
* Ensure important content is crawlable and not unnecessarily dependent on client-side rendering.
* Use descriptive links instead of vague text such as "click here".
* Optimize images and provide meaningful alternative text.
* Use canonical URLs, Open Graph metadata, structured data, and other SEO features where relevant.
* Avoid unnecessary layout shifts and performance regressions.

## Code Quality

Follow established **software engineering best practices**.

Code should be:

* Clear and readable.
* Maintainable.
* Reusable where appropriate.
* Properly typed when TypeScript is used.
* Consistent with the existing codebase.
* Simple rather than unnecessarily abstract.

Avoid:

* Duplicated logic.
* Over-engineering.
* Unnecessary dependencies.
* Large components with multiple unrelated responsibilities.
* Workarounds when a standard platform or framework solution exists.

Before introducing a new dependency, consider whether the functionality can reasonably be implemented using the existing stack.

## Performance

Performance should be considered when implementing features.

* Minimize unnecessary JavaScript shipped to the browser.
* Avoid unnecessary re-renders.
* Lazy-load expensive resources when appropriate.
* Optimize images and other media.
* Avoid unnecessary network requests.
* Be mindful of Core Web Vitals.
* Prefer server-side solutions when they reduce client-side complexity and bundle size.

Performance improvements must not come at the expense of accessibility or maintainability.

## Before Completing a Task

Before considering a task complete:

1. Verify the implementation works on mobile and desktop.
2. Check for obvious accessibility issues.
3. Check that SEO has not been negatively affected.
4. Ensure there are no TypeScript, linting, or build errors.
5. Run the relevant tests when available.
6. Confirm that existing functionality has not been unintentionally broken.
7. Keep changes focused on the requested task and avoid unrelated refactors.
8. Verify that newly created components expose their public API through their `index.ts` file.

When multiple valid implementations exist, prefer the solution that is **simpler, accessible, performant, SEO-friendly, and consistent with Next.js best practices**.
