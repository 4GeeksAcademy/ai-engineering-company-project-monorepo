# Project brief — Brasaland

**Source of truth:** root [`CONTEXT.md`](../CONTEXT.md) (“Welcome to Brasaland”). This file only maps that briefing onto this monorepo. Do not invent another company.

## Business description (from `CONTEXT.md`)

Brasaland is a grilled food restaurant chain founded in **2008 in Medellín, Colombia**. It grew into **14 company-owned restaurants** in **Colombia and the United States (Florida)**, with about **115 employees** and about **USD 6 million** annual revenue.

Brand commitments in `CONTEXT.md`: taste that matches in Medellín or Miami, warm consistent service, and a kitchen that moves fast. HQ is Medellín; a Miami office coordinates Florida. **Mariana Restrepo** is CEO (since 2019). **Brasaland Digital** is the internal team building modern systems without losing that identity. You are part of that team (`CONTEXT.md`).

### Organisation and problems (`CONTEXT.md` → “The Departments and Their Problems”)

| Department | Lead | Stated need in `CONTEXT.md` |
| --- | --- | --- |
| Restaurant Operations | Felipe Guerrero | Real-time sales dashboard per location (**COP and USD**); intelligent ingredient ordering from history + stock; alerts when a location shows no sales during opening hours |
| Procurement and Suppliers | Lucía Fernández | Supplier platform with price history/alerts; consolidated purchasing across both markets (~20 suppliers) |
| Marketing and Digital Experience | Camila Ospina | Digital loyalty/ordering (“Brasa Points” today = physical stamp cards); customer CRM; personalisation |
| People and Culture | Ashley Turner (Miami) | HR portal, automated onboarding, HR KPIs by country |
| Training and Quality Standards | Jake Morrison (Miami) | Searchable recipe catalogue; push updates to all 14 locations; ES/EN optional |
| Technology | Nicolás Park (Medellín) | **Central API**: locations, menus, sales, customers, suppliers; real-time telemetry; pipeline into ops/marketing/finance dashboards |
| Executive Direction | Mariana Restrepo | Executive dashboard (chain sales **USD and COP**); NL AI assistant; automated weekly report **Monday 07:00** |

## Project objectives (this monorepo)

Deliver Brasaland Digital work inside the existing layout so each milestone reduces a gap above:

1. Grow the **central FastAPI** toward Technology’s list: locations, menus, sales, customers, suppliers (routers under `services/`, not a new microservice fleet).
2. Capture **location telemetry** and run **pipelines** that feed operations and finance views (14 locations, two currencies).
3. Give Mariana what `CONTEXT.md` names: chain sales in USD+COP, a queryable assistant, Monday 07:00 weekly report.
4. Later: intelligent ordering (Operations), supplier price history (Procurement), digital Brasa Points / CRM (Marketing), HR KPIs (People), recipe catalogue (Training).

## Problem it solves

`CONTEXT.md` states Brasaland is profitable but runs a two-country chain with single-restaurant tools: WhatsApp ingredient orders, stamp-card loyalty, no real-time location visibility, leadership that cannot answer basic questions without phone calls. Competitors already use digital ordering and operational dashboards.

This monorepo is where Brasaland Digital replaces that stack. Domain facts, names, and constraints come only from [`CONTEXT.md`](../CONTEXT.md) — never from the old four-company placeholder, TrackFlow, Nexova, or HealthCore.
