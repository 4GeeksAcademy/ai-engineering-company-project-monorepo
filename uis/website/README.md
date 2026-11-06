# TrackFlow Website

Public-facing corporate website for TrackFlow.

## Purpose

This app communicates TrackFlow's logistics identity and operating footprint (United States + Spain), aligned with `CONTEXT.md`.

## Tech

- Next.js App Router
- React
- TypeScript

## Run locally

```bash
cd uis/website
npm install
npm run dev
```

Open `http://localhost:3000`.

## Performance & Quality Skills

Three agent skills from [`skills.sh`](https://www.skills.sh) are installed in the monorepo [`skills/`](../../skills/) directory and applied to this app:

| Skill | Source | Applied to website |
|--------|--------|-------------------|
| **Core Web Vitals** (LCP, FCP, TTFB, CLS) | [`skills/core-web-vitals/SKILL.md`](../../skills/core-web-vitals/SKILL.md) | CSS consolidation removed render-blocking inline `<style>`; favicon 404 eliminated via inline SVG data URI |
| **Performance** (TBT, Speed Index, budgets) | [`skills/performance/SKILL.md`](../../skills/performance/SKILL.md) | transition keywords normalized; invalid `conic-gradient` → `radial-gradient`; loading.tsx now uses shared `LoadingFallback` |
| **Web Performance** (network payload, resource hints) | [`skills/web-perf/SKILL.md`](../../skills/web-perf/SKILL.md) | Consolidated single-source `globals.css` (~370 lines); reduced DOM complexity via shared component extraction |

**Measured impact** (Lighthouse Performance, corporate-site desktop): **83 → 100** after applying corrections from all three skills.
