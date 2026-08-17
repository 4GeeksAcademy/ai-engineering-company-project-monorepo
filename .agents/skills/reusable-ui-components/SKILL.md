---
name: reusable-ui-components
description: Identify recurring UI layouts and extract them into reusable, well-scoped components without flattening meaningful page differences. Use when building, reviewing, or refactoring frontend screens with repeated structure, especially React or Next.js interfaces.
---

# Reusable UI Components

## Objective

Keep recurring interface structure in one reusable component so layout changes, accessibility fixes, and visual adjustments stay consistent across the product.

## When to use

Use this skill when:

1. Two or more screens repeat the same layout structure, such as headers, navigation shells, form sections, table rows, cards, empty states, or loading states.
2. A page contains repeated markup for the same visual pattern.
3. A new screen is being added beside an existing screen with a similar composition.
4. A review finds copy-pasted JSX, HTML, CSS, or interaction logic for a shared pattern.
5. A component has become a page-specific bundle of unrelated layout responsibilities and needs a smaller reusable boundary.

Do not extract a component merely because a block is long. Extract when the pattern repeats, has a stable responsibility, or has a meaningful independent interaction or accessibility contract.

## Procedure

1. Inspect the nearest sibling pages and components before editing. Identify repeated structure, repeated behavior, shared states, and intentional differences.
2. State the component boundary in one sentence, including what the component owns and what the caller controls.
3. Extract the smallest stable unit. Prefer components with a focused visual or interaction responsibility over large page shells that accept many unrelated flags.
4. Define an explicit typed API for React components. Pass data, callbacks, and slots through props; keep page-specific fetching and business decisions in the page or feature layer.
5. Preserve semantic HTML, accessible names, keyboard behavior, focus handling, responsive behavior, and existing visual conventions during extraction.
6. Keep variation declarative. Prefer typed props, composition, and named slots over boolean-prop combinations that create many hidden layouts.
7. Co-locate feature-specific components with their feature. Promote a component to a shared directory only when at least two consumers genuinely need it and the abstraction remains domain-neutral.
8. Replace every applicable duplicate in the touched scope, while leaving intentionally different layouts explicit.
9. Validate the extracted component in isolation where practical, then run the narrowest relevant lint, typecheck, build, or test command.
10. Check the rendered layouts at their relevant responsive breakpoints and confirm that long text, loading states, empty states, and error states do not change the component dimensions unexpectedly.

## Extraction checklist

- The repeated pattern has a named responsibility.
- The component API is smaller than the duplicated implementation it replaces.
- Data and behavior that vary between consumers are represented by typed props or composition.
- Fetching, routing, and page-level business rules remain outside presentational components unless they are part of the component's stated responsibility.
- No unrelated page markup was moved into the component.
- Semantic elements and accessible interaction behavior are preserved.
- Styling remains consistent with the existing design system and responsive rules.
- The component has at least one focused validation path.
- Existing consumers render the same content and behavior after extraction.

## Preferred patterns

Use these patterns when they fit the local codebase:

- A shared layout component owns structure and accepts `children` or named slots for page-specific content.
- A repeated item component receives one typed record and emits user actions through callbacks.
- A shared state component models loading, empty, and error states explicitly instead of relying on scattered conditional markup.
- A compound component is appropriate when several subcomponents must share layout context and are always used together.

Avoid:

- Copying a page and changing a few strings to create a second layout.
- A universal component with many unrelated boolean props.
- Passing arbitrary untyped objects when a narrow interface is available.
- Moving data fetching into a visual component only to make the page shorter.
- Extracting a one-off block whose visual and behavioral contract is still changing.

## Validation

For every extraction, verify:

1. TypeScript or template compilation succeeds.
2. Linting reports no new issues.
3. Focused tests or a targeted browser check cover the shared behavior when one exists.
4. All known consumers still render their distinct content and states.
5. Responsive and keyboard behavior remains intact.

When a duplicate cannot be cleanly extracted, document the reason in the change summary and keep the layouts separate rather than forcing a leaky abstraction.