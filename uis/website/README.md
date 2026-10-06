# Brasaland public website

Public-facing corporate site for **Brasaland** (see root [`CONTEXT.md`](../../CONTEXT.md)).

**Location:** `uis/website/` — matches the monorepo template’s `uis/website` slot (Marketing / Camila Ospina).  
`uis/web/` remains the separate incident-analysis HTML tool; do not conflate the two.

## Stack

- React 19 + TypeScript + Vite
- React Router (`/` → home)
- Shared visual tokens in `src/styles/tokens.css`
- Copy/facts in `src/content/brand.ts` (aligned with `CONTEXT.md`)

## Run

```bash
cd uis/website
npm install
npm run dev
```

Open the printed local URL (default `http://localhost:5173/`). Route `/` renders the corporate home page.

```bash
npm run build   # production build → dist/
```

## Structure

```text
src/
  components/   # SiteHeader, Hero, BrandPillars, Markets, LoyaltyTeaser, SiteFooter
  content/      # brand.ts — CONTEXT-aligned facts
  pages/        # HomePage
  styles/       # tokens.css — company visual identity
```
