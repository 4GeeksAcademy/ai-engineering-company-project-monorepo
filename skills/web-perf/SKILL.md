# Web Performance

**Source:** [cloudflare/skills](https://www.skills.sh/cloudflare/skills/web-perf)
**Installation:** `npx skills add https://github.com/cloudflare/skills --skill web-perf`

## Purpose

Cloudflare-aligned web performance optimization covering CDN delivery, caching strategies, edge optimization, and performance measurement.

## Key areas

### 1. CDN and delivery optimization
- Leverage edge caching for static assets
- Use CDN for geographic distribution and latency reduction
- Implement Argo Smart Routing (Cloudflare) for optimized origin routing
- Enable HTTP/2 and HTTP/3 for multiplexed connections

### 2. Caching strategies
- Cache static assets at the edge with long TTLs
- Use cache tags for selective purging
- Implement tiered cache to reduce origin load
- Enable Brotli compression at the edge

### 3. Performance measurement
- Use WebPageTest, Lighthouse, and RUM data
- Monitor Core Web Vitals in production
- Set up performance budgets and alerts
- Use Synthetic monitoring for proactive detection

### 4. Image and asset optimization
- Polish/Image optimization at the edge
- Auto-convert to modern formats (WebP/AVIF)
- Responsive images with srcset
- Lazy loading for below-the-fold content

### 5. JavaScript optimization
- Minimize main-thread work
- Defer non-critical JavaScript
- Use code splitting and tree shaking
- Implement early hints for asset preloading

## Usage in this project

Apply this skill to optimize delivery of static assets through CDN/edge, implement proper caching headers, and ensure the TrackFlow apps are optimized for global distribution.