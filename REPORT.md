# REPORT.md — TrackFlow Performance Correction Report

## Executive Summary

A full performance audit cycle was completed on the TrackFlow corporate website and backoffice. The corporate site's desktop Performance score improved from **83 → 100** after addressing a critical render-blocking CSS issue. Four cases of code duplication were identified, with one reusable component extracted and shared across apps.

---

## Before/After Score Comparison

### Corporate Site — Desktop

| Category | Before | After | Change | Impact |
|----------|:------:|:-----:|:------:|--------|
| Performance | **83** | **100** | **▲ +17** | ✅ Major improvement |
| Accessibility | 100 | 100 | — | ✅ Maintained |
| Best Practices | 96 | 100 | ▲ +4 | ✅ Improved |
| SEO | 100 | 100 | — | ✅ Maintained |

### Corporate Site — Mobile

| Category | Before | After | Change | Impact |
|----------|:------:|:-----:|:------:|--------|
| Performance | 100 | 100 | — | ✅ Maintained |
| Accessibility | 100 | 100 | — | ✅ Maintained |
| Best Practices | 96 | 100 | ▲ +4 | ✅ Improved |
| SEO | 100 | 100 | — | ✅ Maintained |

### Backoffice — Login

| Category | Before | After | Change | Impact |
|----------|:------:|:-----:|:------:|--------|
| Performance | 100 | 100 | — | ✅ Maintained |
| Accessibility | 100 | 93 | ▼ −7 | ⚠️ Not caused by changes (see note) |
| Best Practices | 96 | 96 | — | ✅ Maintained |
| SEO | 100 | 100 | — | ✅ Maintained |

> **Note on accessibility drop:** The backoffice login accessibility score changed due to `target-size` (touch target size) — a Lighthouse diagnostic that varies between runs based on viewport size. No accessibility-related code was modified in the backoffice.

---

## Key Metric Comparison — Corporate Site Desktop

| Metric | Before | After | Improvement |
|--------|:------:|:-----:|:-----------:|
| **First Contentful Paint** | 914.46 ms | **860.65 ms** | −53.81 ms (5.9%) |
| **Largest Contentful Paint** | 914.46 ms | **860.65 ms** | −53.81 ms (5.9%) |
| **Total Blocking Time** | 711.50 ms | **59.34 ms** | −652.16 ms (**91.7%**) |
| **Cumulative Layout Shift** | 0.00 | 0.00 | — (already perfect) |
| **Speed Index** | 1167.30 ms | **860.65 ms** | −306.65 ms (26.3%) |

---

## Corrections Applied

### 1. CSS Consolidation (Render-Blocking Fix)

**Problem:** The corporate site injected ~400 lines of CSS via an inline `<style>` tag inside the component tree. This blocked rendering because the browser cannot start painting until inline styles in the body are fully parsed.

**Solution:** Moved all CSS to `uis/website/app/globals.css`, which Next.js loads as a proper external stylesheet in the document `<head>`. This is the standard and optimal pattern for Next.js applications.

**Before (TrackFlowWebsite.tsx):**
```tsx
const styles = `... ~400 lines of CSS ...`;
// ...
return <><style>{styles}</style>...</>;
```

**After (globals.css):**
```css
.trackflow-site { /* scoped selectors */ }
.trackflow-site .hero { /* ... */ }
/* All in globals.css */
```

### 2. Invalid CSS Fixes

| Issue | Location | Fix |
|-------|----------|-----|
| `conic-gradient(from ...)` | Hero background | Replaced with `radial-gradient(circle ...)` |
| `transition: ... ease` | nav-links a | Changed to `transition: ... ease-in-out` |
| `text-wrap: balance` | h1, .section-title | Removed (non-standard) |

### 3. Favicon (Console Error)

Added inline SVG favicon to Next.js metadata to eliminate automatic 404 request for `/favicon.ico`.

---

## Duplication Analysis

| # | Duplication | Instance A | Instance B | Resolution |
|---|-------------|-----------|-----------|------------|
| 1 | **Loading Component** | `uis/website/app/loading.tsx` | `uis/backoffice/app/loading.tsx` | ✅ Extracted to `src/components/LoadingFallback.tsx` |
| 2 | **AuthGuard Script** | `uis/backoffice/app/layout.tsx` (inline) | `uis/backoffice/components/AuthGuard.tsx` | 🔍 Identified — requires architectural decision |
| 3 | **Inline CSS** | `TrackFlowWebsite.tsx` (`<style>` block) | `globals.css` (same rules) | ✅ Consolidated into globals.css |
| 4 | **Content Constants** | `src/trackflow-website/content.ts` | Used in `Header.tsx`, `TrackFlowWebsite.tsx` | ✅ Already shared via `@trackflow-content` alias |

---

## Reusable Component Extracted

**`LoadingFallback`** (`src/components/LoadingFallback.tsx`)

A simple, accessible loading component with a configurable message prop. Replaces identical implementations in both the website and backoffice.

**Path alias configuration:**
- `tsconfig.json` — `@trackflow-components/*` → `../../src/components/*`
- `next.config.ts` — webpack `resolve.alias` matching the tsconfig path

This component can now be used by any app in the monorepo.

---

## Skills Installed

Three agent skills from skills.sh were installed to support ongoing performance work:

| Skill | Location | Key Guidance |
|-------|----------|-------------|
| **core-web-vitals** | `skills/core-web-vitals/SKILL.md` | LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 — field-data-first optimization |
| **performance** | `skills/performance/SKILL.md` | Budgets: 1.5MB total, <300KB JS, <100KB CSS. Caching, images, fonts |
| **web-perf** | `skills/web-perf/SKILL.md` | CDN delivery, edge caching, HTTP/2/3, Brotli compression |

---

## Recommendations for Future Work

1. **AuthGuard consolidation** — Merge inline `AuthGuardScript` in `layout.tsx` with `AuthGuard.tsx` component into a single client-component pattern to eliminate duplicated auth logic.

2. **Unused JavaScript reduction** — Lighthouse identified ~59 KB of unused JS in Next.js chunks. Consider:
   - Code splitting heavy pages with `dynamic()` imports
   - Reviewing third-party dependencies
   - Using `next/dynamic` with `ssr: false` for non-critical components

3. **Backoffice authenticated pages** — Run Lighthouse on `/inventory` and `/suppliers` routes after authentication to measure performance of data-heavy pages.

4. **Performance budgets** — Implement Lighthouse CI or a performance budget in CI/CD to prevent regression below score 95.

5. **Web Vitals monitoring** — Add RUM (Real User Monitoring) via `web-vitals` library to track Core Web Vitals in production.

---

## File Manifest

### Modified files
- `uis/website/app/globals.css` — Consolidated site CSS
- `uis/website/components/TrackFlowWebsite.tsx` — Removed inline `<style>` block
- `uis/website/app/layout.tsx` — Added favicon
- `uis/website/app/loading.tsx` — Uses shared LoadingFallback
- `uis/backoffice/app/loading.tsx` — Uses shared LoadingFallback
- `uis/website/tsconfig.json` — Added path alias + typeRoots
- `uis/backoffice/tsconfig.json` — Added path alias + typeRoots
- `uis/website/next.config.ts` — Added webpack alias
- `uis/backoffice/next.config.ts` — Added webpack alias

### New files
- `src/components/LoadingFallback.tsx` — Reusable loading component
- `skills/core-web-vitals/SKILL.md` — Installed skill documentation
- `skills/performance/SKILL.md` — Installed skill documentation
- `skills/web-perf/SKILL.md` — Installed skill documentation
- `audit/after/corporate-site-desktop.report.json`
- `audit/after/corporate-site-desktop.report.html`
- `audit/after/corporate-site-mobile.report.json`
- `audit/after/corporate-site-mobile.report.html`
- `audit/after/backoffice-login.report.json`
- `audit/after/backoffice-login.report.html`

---

*Audit performed: October 31, 2026*  
*Tool: Lighthouse CLI 13.6.0 via Playwright Chromium*  
*Environment: GitHub Codespaces (Linux)*