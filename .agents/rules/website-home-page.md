# Rule: Website Home Page

## Scope

- Type: scoped rule
- Applies to: `uis/website/app/page.tsx`

## Purpose

Keep changes to the Nexova website Home page focused, context-aligned, and separate from other routes and applications in the monorepo.

## Required behavior

1. Treat `uis/website/app/page.tsx` as the only file governed by this rule.
2. Preserve Nexova terminology, messaging, and the existing Home-page user journey when making changes.
3. Preserve responsive behavior, accessibility, and existing Home-page interactions unless the request explicitly changes them.
4. Do not modify `uis/website/app/application/**`, `uis/talent-pipeline-tracker/**`, `uis/backoffice/**`, or unrelated repository areas under this rule.
5. Before changing supporting styles or assets, confirm that the user explicitly included those files in scope.

## Verification checklist

1. The requested change is limited to the Home page.
2. Application-route behavior remains outside the change unless separately requested.
3. Nexova wording and Home-page interactions remain intact.
4. Responsive and accessibility behavior were considered for any changed Home-page markup.

## Anti-patterns

1. Applying a Home-page request to the application route or another UI.
2. Expanding the file scope to shared styles or assets without explicit approval.
3. Replacing Nexova-specific content with generic template wording.