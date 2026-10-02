# Brasaland Backoffice

Internal admin dashboard for Brasaland restaurant chain operations management.

## Overview

The backoffice provides a centralized dashboard for managing and monitoring Brasaland's 14 restaurant locations across Colombia and the United States. It includes:

- **Dashboard** — High-level KPIs: revenue trends, order volumes, loyalty program metrics
- **Locations** — Performance breakdown by each of the 14 restaurants (revenue, orders, avg ticket, staff)
- **Orders** — Order traceability with status tracking (pending → preparing → ready → delivered)
- **Brasa Points** — Loyalty program analytics, member directory, points circulation and redemption rates

## Data Modules

| Module | Description |
|--------|-------------|
| `Revenue` | 30-day revenue by country (Colombia COP / US USD), by location, daily trends |
| `Orders` | Order status pipeline, items, customer info, location attribution |
| `Locations` | 14 restaurants with manager, staff count, address, opening year, performance metrics |
| `Brasa Points` | Member registration data, points earned/redeemed, city distribution, top members |

## Tech Stack

- **Next.js** (App Router)
- **React** with TypeScript
- **Tailwind CSS**
- Mock data (replaceable with API integrations)

## Project Structure

```
uis/backoffice/
├── app/
│   ├── layout.tsx          # Root layout with sidebar
│   ├── page.tsx            # Redirects to /dashboard
│   ├── globals.css         # Tailwind + Brasaland theme
│   ├── dashboard/page.tsx  # Main KPI dashboard
│   ├── locations/page.tsx  # Location performance grid
│   ├── orders/page.tsx     # Order traceability
│   └── loyalty/page.tsx    # Brasa Points analytics
├── components/
│   ├── Sidebar.tsx         # Navigation sidebar
│   ├── KPICard.tsx         # Reusable metric card
│   ├── SalesChart.tsx      # Revenue trend bar chart
│   ├── RevenueByCountry.tsx # Country breakdown donut
│   ├── RecentOrdersTable.tsx # Orders summary table
│   └── TopMembersList.tsx  # Top loyalty members
├── lib/
│   └── data.ts             # Mock data & helpers
└── README.md
```

## Running

```bash
cd uis/backoffice
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/dashboard`.

## Notes

- All data is currently mocked. Integrate with Brasaland's internal APIs for production use.
- Revenue in Colombia uses COP values; US locations use USD.
- The `locations.ts` data from the root `lib/` folder can be shared across UIs.
