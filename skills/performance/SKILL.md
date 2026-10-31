# Performance optimization

**Source:** [addyosmani/web-quality-skills](https://www.skills.sh/addyosmani/web-quality-skills/performance)
**Installation:** `npx skills add https://github.com/addyosmani/web-quality-skills --skill performance`

## Purpose

Lighthouse-based performance optimization with budgets, critical rendering path guidance, and Core Web Vitals alignment. Evidence-led performance optimization using real-user signals for prioritization and browser traces for diagnosis.

## Resource budgets

| Resource | Budget |
|----------|--------|
| Total page weight | ≤ 1.5 MB |
| JavaScript | ≤ 300 KB |
| CSS | ≤ 100 KB |
| TTFB (server response) | ≤ 800 ms |

## Optimization areas

### 1. Server response
- HTTP/2 or HTTP/3
- Edge caching/CDN
- Compressed responses (Brotli/Gzip)

### 2. Resource loading
- Preconnect/Preload critical assets
- Defer non-critical CSS
- Script deferral patterns (`async`/`defer`)
- Code splitting and dynamic imports

### 3. Image optimization
- AVIF/WebP with fallback
- Responsive `srcset` markup
- LCP image prioritization (`fetchpriority="high"`)
- Lazy loading for below-fold images

### 4. Font strategies
- Variable fonts for smaller payloads
- `font-display: swap` to prevent invisible text
- Subsetting to include only needed characters

### 5. Runtime performance
- Layout thrashing prevention (batch DOM reads/writes)
- Debouncing/throttling frequent event handlers
- `requestAnimationFrame` for visual updates
- List virtualization for large datasets

### 6. Caching
- Cache-Control headers (immutable for hashed assets)
- Service worker caching strategies (stale-while-revalidate)

### 7. Third-party scripts
- Async loading
- Interaction-based delays
- Facade patterns (replace embeds with static previews)

## Workflow

1. If a page can run, establish a field-plus-lab baseline before editing.
2. Prioritize poor real-user Core Web Vitals. Use a DevTools performance trace and its focused insights to find the cause.
3. Inspect and change only the code or assets connected to measured bottlenecks.
4. Re-run equivalent lab measurements and report before/after values, conditions, and uncertainty. Field verification remains pending until enough new user data arrives.

## Usage in this project

Apply this skill after the initial Lighthouse baseline to systematically address performance bottlenecks. Used to guide the TrackFlow corporate site optimization from Performance score 83 to 100.