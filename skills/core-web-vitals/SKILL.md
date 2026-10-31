# Core Web Vitals optimization

**Source:** [addyosmani/web-quality-skills](https://www.skills.sh/addyosmani/web-quality-skills/core-web-vitals)
**Installation:** `npx skills add https://github.com/addyosmani/web-quality-skills --skill core-web-vitals`

## Purpose

Targeted optimization for the three Core Web Vitals using field data to identify user impact and browser traces to diagnose causes.

## Workflow

When a runnable URL is available, follow the performance measurement workflow:

1. **Check page-level CrUX p75 data**, with a clearly labeled origin fallback when page data is unavailable.
2. **Record a browser performance trace** under stated conditions. With Chrome DevTools MCP, trace summaries can include CrUX alongside the observed lab metrics.
3. **Analyze only the insights** associated with the failing metric, then inspect the implicated code and resources.
4. **Re-run equivalent lab measurements** after the fix. Do not claim an immediate field improvement; CrUX and first-party RUM need new user visits.

## The three metrics

| Metric | Description | Target (p75) |
|--------|-------------|---------------|
| **LCP** (Largest Contentful Paint) | Loading performance – how quickly the main content renders | ≤ 2.5s |
| **INP** (Interaction to Next Paint) | Interactivity – how quickly the page responds to user input | ≤ 200ms |
| **CLS** (Cumulative Layout Shift) | Visual stability – how much the layout shifts unexpectedly | ≤ 0.1 |

## Key optimizations

- **LCP:** Preload hero images, optimize critical rendering path, use responsive images with `fetchpriority="high"`
- **INP:** Use dynamic imports for heavy components, `useTransition` for non-urgent state updates, debounce frequent handlers
- **CLS:** Set explicit dimensions on images/videos with `width` and `height`, reserve space for dynamic content (ads, embeds), use `aspect-ratio` in CSS

## Usage in this project

Apply this skill after running Lighthouse audits to identify which Core Web Vital is failing and to trace root causes via browser traces. Used in the TrackFlow performance audit cycle.