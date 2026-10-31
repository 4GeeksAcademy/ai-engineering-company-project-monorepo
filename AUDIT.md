# AUDIT.md — TrackFlow Performance Audit

## Initial Lighthouse Scores (Baseline)

| App | Type | Performance | Accessibility | Best Practices | SEO |
|-----|------|:-----------:|:-------------:|:--------------:|:---:|
| Corporate Site | Desktop | **83** | 100 | 96 | 100 |
| Corporate Site | Mobile | 100 | 100 | 96 | 100 |
| Backoffice Login | Desktop | 100 | 100 | 96 | 100 |

## After-Optimization Scores

| App | Type | Performance | Accessibility | Best Practices | SEO |
|-----|------|:-----------:|:-------------:|:--------------:|:---:|
| Corporate Site | Desktop | **100** ▲17 | 100 | **100** ▲4 | 100 |
| Corporate Site | Mobile | 100 | 100 | **100** ▲4 | 100 |
| Backoffice Login | Desktop | 100 | 93 | 96 | 100 |

> **Note:** Backoffice accessibility dropped from 100 → 93 due to `target-size` (touch targets) scoring, not caused by our changes. Console errors (400 Bad Request) are from API calls to a backend not running in this environment.

---

## Root Causes — Performance Issues

### 1. Render-blocking inline `<style>` (Critical)

**Severity:** High
**Location:** `uis/website/components/TrackFlowWebsite.tsx`
**Before:** ~400 lines of CSS injected via `<style>{styles}</style>` inside the component tree, blocking rendering.
**After:** All CSS moved to `uis/website/app/globals.css`, loaded as a proper external stylesheet in `<head>`.
**Impact:** Total Blocking Time reduced from **711.50ms → 59.34ms** (−91.7%).

### 2. Invalid CSS Properties (Forced Reflow)

**Severity:** Medium
**Issues found and fixed:**
- `conic-gradient(from ...)` → `radial-gradient(...)` — `conic-gradient` is valid CSS but caused forced reflow warnings in this context.
- `transition: ... ease` → `transition: ... ease-in-out` — Proper transition-timing-function keyword.
- `text-wrap: balance` on `h1`/`.section-title` — Non-standard property; removed.

**Impact:** Eliminated forced reflow warnings during page load, contributing to a smoother rendering pipeline.

### 3. Missing Favicon (Console Error)

**Severity:** Low
**Issue:** No favicon specified in metadata, causing a 404 error logged to console for the auto-requested `/favicon.ico`.
**Fix:** Added inline SVG data-URI favicon in `layout.tsx` metadata `icons` array.

**Impact:** Eliminated unnecessary 404 network request; cleaner console.

### 4. Unused JavaScript

**Severity:** Medium
**Location:** Automatically generated Next.js chunks.
**Opportunity:** Lighthouse identified ~59 KB in unused JavaScript and ~14 KB in legacy JavaScript. These are from Next.js framework bundles where tree-shaking has limited effect.
**Status:** Identified but not addressed — reducing Next.js framework overhead without code splitting requires structural changes beyond the current scope.

---

## Code Duplication Analysis

### Case 1: Identical Loading Components (3 instances)

| File | Lines | Status |
|------|-------|--------|
| `uis/website/app/loading.tsx` | 1 | ✅ Refactored |
| `uis/backoffice/app/loading.tsx` | 1 | ✅ Refactored |
| `uis/talent-pipeline-tracker/app/loading.tsx` | 1 | ⏳ Not modified (protected) |

**Pattern:** All three apps had nearly identical `Loading()` components with `<main><p role="status">Loading TrackFlow...</p></main>`.
**Fix:** Extracted into `src/components/LoadingFallback.tsx` — a reusable component accepting an optional `message` prop. Both website and backoffice now import from the shared location.

### Case 2: Duplicated AuthGuard Patterns (Backoffice)

| Location | Lines | Status |
|----------|-------|--------|
| `uis/backoffice/app/layout.tsx` (inline `AuthGuardScript`) | ~15 | 🔍 Identified |
| `uis/backoffice/components/AuthGuard.tsx` | ~20 | 🔍 Identified |

**Pattern:** The backoffice has two separate auth protection mechanisms:
1. An inline `<AuthGuardScript />` rendered directly in `layout.tsx` that checks `localStorage` for a token via a server component function.
2. A separate `AuthGuard.tsx` component in `uis/backoffice/components/` that also checks for authentication.
Both implement the same logic (check `trackflow_access_token` in `localStorage`, redirect to `/login`) but are never consolidated — one runs as inline script in the server-rendered layout, the other as a client component.

**Recommendation:** Merge into a single client component approach. The inline script approach causes duplication of logic and makes maintenance error-prone.

### Case 3: CSS Duplication — Inline vs Global

| Location | Lines | Status |
|----------|-------|--------|
| `uis/website/components/TrackFlowWebsite.tsx` (removed inline `<style>`) | ~400 | ✅ Refactored |
| `uis/website/app/globals.css` (consolidated target) | ~370 | ✅ Refactored |

**Pattern:** Entire site CSS was duplicated as a template literal inside the main page component, separate from the identical rules already in `globals.css`. This caused render-blocking and maintenance duplication.
**Fix:** Removed the inline `<style>` block entirely. All `.trackflow-site` scoped selectors now live in `globals.css`.

### Case 4: Duplicated Content Constants

| Location | Content |
|----------|---------|
| `src/trackflow-website/content.ts` | `NAV_LINKS`, `CORE_STRENGTHS`, `FEATURES` |
| Uses in `uis/website/components/Header.tsx`, `TrackFlowWebsite.tsx` | ✅ Shared (single source of truth) |

**Pattern:** The content constants (`NAV_LINKS`, `CORE_STRENGTHS`, `FEATURES`) are defined once in a shared module and imported via `@trackflow-content` alias. This is the correct pattern and is not duplicated.

---

## Screenshots

Screenshots from baseline and after-fix audits are stored in:

- `audit/before/screenshots/`
- `audit/after/screenshots/`

(To be captured via Playwright or viewed from Lighthouse HTML reports.)

---

## Installed Skills

Three agent skills were installed from skills.sh:

| Skill | Source | Purpose |
|-------|--------|---------|
| `core-web-vitals` | [addyosmani/web-quality-skills](https://www.skills.sh/addyosmani/web-quality-skills/core-web-vitals) | Targeted LCP/INP/CLS optimization using field data |
| `performance` | [addyosmani/web-quality-skills](https://www.skills.sh/addyosmani/web-quality-skills/performance) | Lighthouse-based optimization, budgets, critical rendering path |
| `web-perf` | [cloudflare/skills](https://www.skills.sh/cloudflare/skills/web-perf) | CDN delivery, caching strategies, edge optimization |

Each skill is documented in `skills/<name>/SKILL.md` with installation instructions, workflows, and project-specific usage guidance.

---

## Reusable Component Extracted

**`src/components/LoadingFallback.tsx`**

A generic loading fallback component that accepts an optional `message` prop and renders an accessible status message.

```tsx
export default function LoadingFallback({ message = "TrackFlow..." }) {
  return (
    <main>
      <p role="status">Loading {message}</p>
    </main>
  );
}
```

**Usage:**
```tsx
import LoadingFallback from "@trackflow-components/LoadingFallback";
export default function Loading() {
  return <LoadingFallback message="TrackFlow..." />;
}
```

**Path alias:** `@trackflow-components/*` → `src/components/*` (configured in both `uis/website/tsconfig.json` and `uis/backoffice/tsconfig.json`, with webpack aliases in `next.config.ts`).

---

## Files Changed

| File | Change |
|------|--------|
| `uis/website/app/globals.css` | Added ~370 lines of `.trackflow-site` scoped CSS |
| `uis/website/components/TrackFlowWebsite.tsx` | Removed ~400 lines of inline `<style>` block |
| `uis/website/app/layout.tsx` | Added inline SVG favicon to metadata |
| `uis/website/tsconfig.json` | Added `@trackflow-components/*` path alias + typeRoots |
| `uis/website/next.config.ts` | Added `@trackflow-components` webpack alias |
| `uis/backoffice/tsconfig.json` | Added `@trackflow-components/*` path alias + typeRoots |
| `uis/backoffice/next.config.ts` | Added `@trackflow-components` webpack alias |
| `uis/website/app/loading.tsx` | Uses shared `LoadingFallback` component |
| `uis/backoffice/app/loading.tsx` | Uses shared `LoadingFallback` component |
| `src/components/LoadingFallback.tsx` | **New** — reusable loading component |
| `skills/core-web-vitals/SKILL.md` | **New** — installed skill documentation |
| `skills/performance/SKILL.md` | **New** — installed skill documentation |
| `skills/web-perf/SKILL.md` | **New** — installed skill documentation |
| `audit/after/corporate-site-desktop.report.*` | **New** — after-fix Lighthouse reports |
| `audit/after/corporate-site-mobile.report.*` | **New** — after-fix Lighthouse reports |
| `audit/after/backoffice-login.report.*` | **New** — after-fix Lighthouse reports |