# Brasaland telemetry plan

Normative field names and types live in [`event-schemas.json`](./event-schemas.json) (JSON Schema draft-07). This document is normative for **when** to emit, **how** to compute metrics, and **how** a row is stored. If a field name here and in the schema ever diverge, follow the schema and update this file in the same change.

Department served: **Technology** (Nicolás Park) — real-time telemetry from each location into the operations, marketing, and finance path. Mandatory metrics below are the needs `CONTEXT.md` states for Restaurant Operations (Felipe Guerrero), Procurement (Lucía Fernández), Marketing (Camila Ospina), People (Ashley Turner), Training (Jake Morrison), and Executive Direction (Mariana Restrepo). Identified opportunities are the rest of the catalog.

There is no telemetry writer in the running API today. `CONTEXT.md` states the chain has no telemetry. This plan is the contract for adding it to the code that already exists.

## Authority

| Fact | Source |
| --- | --- |
| 14 company-owned restaurants, Colombia and Florida; ~115 employees; ~USD 6 million revenue; HQ Medellín | `CONTEXT.md` |
| Sales dashboards in **COP and USD**; no-sales alert during opening hours; ingredient ordering from history and stock | `CONTEXT.md` Restaurant Operations |
| ~20 suppliers; price history and consolidated purchasing across both markets | `CONTEXT.md` Procurement |
| Brasa Points (physical stamp cards today; 60% of customers do not use them) | `CONTEXT.md` Marketing |
| Turnover, absenteeism, vacancy fill time, by country | `CONTEXT.md` People |
| Central API nouns: locations, menus, sales, customers, suppliers; telemetry; pipelines | `CONTEXT.md` Technology |
| Chain sales in USD and COP; weekly report Monday 07:00 | `CONTEXT.md` Executive Direction |
| Canonical `location_id`, country, and currency | `services/api/locations.py` |
| Live product record | `products.csv` via `services/api/inventory.py` (`product_id`, `name`, `quantity`, `unit`) |
| Order shapes already declared | `services/api/models.py` (`Product`, `InboundOrder`, `OutboundOrder`); `services/api/schemas.py` (`OrderType` `INBOUND` / `OUTBOUND`) |
| Weekly KPI consumer | `data/pipelines/pipeline.py` → table `weekly_location_performance` |
| Waste, supplier cadence, loyalty arithmetic | `docs/company-knowledge-base/` |

`CONTEXT.md` wins if a knowledge-base file disagrees with it. The knowledge base supplies the operating thresholds the briefing does not spell out (waste bands, protein cover, Brasa Points rates, order cadence). Those thresholds are identified opportunities. They are not mandatory.

### Identifiers

Mandatory identifiers are only the strings `CONTEXT.md` writes. A plan binding is how this repo points at that string. It is not another mandatory identifier.

| `CONTEXT.md` writes | Plan binding |
| --- | --- |
| 14 company-owned restaurants | The 14 rows in `services/api/locations.py` |
| Colombia; the United States (Florida) | `country` `Colombia` or `United States`. Florida is `region` on the location API |
| COP and USD | `currency` on each location and on each money event. Colombia is COP. Florida is USD |
| the Medellín downtown location | API id `co-med-centro` (name Medellín Centro). `CONTEXT.md` does not print that id |
| the Miami restaurant | `CONTEXT.md` does not name which Florida site. The worked slow-week example uses `us-mia-downtown`. The same test runs for all 14 |
| around 20 suppliers; meat, vegetables, sauces, beverages, packaging, cleaning products | `supplier_id` values minted by this plan. The `sup_` pattern is not in `CONTEXT.md` |
| Brasa Points; physical stamp cards; 60% of customers do not use them | Loyalty participation on `sale_completed`. Earn and redeem rates are not in `CONTEXT.md` |
| website from 2019; no online orders; 2.8 app store rating | Facts. `page_viewed` and the 2.8 baseline are opportunities |
| about 115 people; two countries | People metrics are split by `Colombia` and `United States` |
| Spanish and English, optional, one base language first | `es` is the base locale on a recipe publish. `en` coverage is an opportunity |
| locations, menus, sales, customers, suppliers | The five central-API nouns. Inventory is not one of them |
| every Monday at 7am | 07:00 in `America/Bogota`, because headquarters is Medellín. `CONTEXT.md` does not name the timezone |
| how many covers were served today; whether the Miami restaurant is having a slow week; how much did we sell this week in Florida; which location has the highest average ticket this month | `ops.sales.covers`, `ops.sales.slow_week`, `exec.florida.week_sales`, `exec.ticket.top_location` |

Opening hours, the 45-minute silence gap, the stock threshold of 10, Brasa Points rates, waste bands, and supplier delivery days are not in `CONTEXT.md`.

## Constraints every emitter obeys

- Money is stored in the location currency. Colombia locations are **COP**. Florida locations are **USD**. A chain total is two native sums plus an optional USD rollup. The rollup is labeled converted.
- `location_id` on a location-scoped event is one of the 14 ids in `services/api/locations.py`. The pipeline joins `event_payload.location_id` to `locations.id`. The strings in `tests/pipelines/test_pipeline.py` (`miami-downtown`, `medellin-centro`, `bogota-norte`) are fixture labels. After a failed join, `pipeline.py` fills a missing currency with `USD`, which would report a Colombian location as US dollars. Emit the roster ids below.
- The live inventory file is one chain-wide CSV. It has no `location_id`. Chain-scoped stock events use `location_scope: "chain"`. They are not the four event types the weekly pipeline aggregates.
- A successful HTTP handler returns its business response even when the telemetry write fails. Telemetry is appended after the business write commits.
- `properties` contains no email, phone, postal address, customer name, password, JWT, connection string, or traceback. `UserID` is decimal `users.id` or null. Customer identity is an opaque `customer_id` in `properties` when a digital account exists. `sessionID` and `requestID` are UUIDs, not tokens.
- Timestamps are UTC, written as `YYYY-MM-DDTHH:MM:SSZ` (no milliseconds, no offset other than `Z`).

### Location roster

| `location_id` | Name | Country | Currency | Timezone |
| --- | --- | --- | --- | --- |
| `co-med-centro` | Medellín Centro | Colombia | COP | `America/Bogota` |
| `co-med-elpoblado` | Medellín El Poblado | Colombia | COP | `America/Bogota` |
| `co-bog-chapinero` | Bogotá Chapinero | Colombia | COP | `America/Bogota` |
| `co-bog-norte` | Bogotá Norte | Colombia | COP | `America/Bogota` |
| `co-cali-norte` | Cali Norte | Colombia | COP | `America/Bogota` |
| `co-barranquilla` | Barranquilla | Colombia | COP | `America/Bogota` |
| `co-cartagena` | Cartagena | Colombia | COP | `America/Bogota` |
| `co-pereira` | Pereira | Colombia | COP | `America/Bogota` |
| `us-mia-brickell` | Miami Brickell | United States | USD | `America/New_York` |
| `us-mia-downtown` | Miami Downtown | United States | USD | `America/New_York` |
| `us-orlando` | Orlando | United States | USD | `America/New_York` |
| `us-tampa` | Tampa | United States | USD | `America/New_York` |
| `us-ftlauderdale` | Fort Lauderdale | United States | USD | `America/New_York` |
| `us-jacksonville` | Jacksonville | United States | USD | `America/New_York` |

Eight Colombia ids, six Florida ids. `country` is `Colombia` or `United States` (the `Location.country` enum). Florida is `region` on the location API; telemetry uses `country` plus the `us-` id prefix.

### v1 operating defaults

`CONTEXT.md` requires a no-sales alert during opening hours and does not publish the hours. Until a location record carries hours, the silence monitor uses this v1 contract (field `opening_hours_source` = `telemetry-plan.v1`):

- Local open window: **11:00 inclusive to 22:00 exclusive**, every day, in the location timezone above.
- Silence threshold: **45 minutes** with zero `sale_completed` inside that window.
- Chain week for Mariana’s Monday report: Monday 00:00 through the next Monday 00:00 in `America/Bogota` (Colombia is UTC−5 year-round). A job that fires Monday 07:00 America/Bogota reports the **previous** chain week.
- Low-stock edge on the current CSV uses threshold **10**, the default argument of `get_alerts` in `services/api/inventory.py`.
- USD conversion rate for COP amounts is the process environment variable `BRASALAND_FX_USD_PER_COP` (USD for one COP). USD events use rate `1`. When the variable is unset, COP events set `fx_status` to `missing` and omit `amount_usd`. An emergency COP order with `fx_status: missing` sets `approval_required` to `true`.

## Entities the events describe

### Product (live)

`GET/POST /inventory` and `PATCH /inventory/{product_id}` persist `products.csv`:

| CSV column | Event field | Rule |
| --- | --- | --- |
| `product_id` | `product_id` | Integer ≥ 1, assigned by `create_product` |
| `name` | `product_name` | Strip whitespace, same value written to the CSV |
| `quantity` | `quantity`, `quantity_before`, `quantity_after` | Integers ≥ 0. `apply_delta` rejects a result below 0 with HTTP 400, leaves `products.csv` unchanged, and emits `direct_stock_edit_rejected` |
| `unit` | `unit` | Free string, length ≥ 1 (`kg`, `liters`, `boxes` are current samples) |

`services/api/schemas.py` also declares `sku`, `price`, and string `product_id` on a future product model. The live writer does not have those columns. Emit the CSV shape. When a router starts writing `services/api/models.py` `Product`, keep `product_id` as that row’s integer primary key (do not switch the telemetry id to a SKU).

### Order (declared, no live router)

`InboundOrder` / `OutboundOrder` in `services/api/models.py`: `id`, `product_id`, `quantity`, `created_at`, `user_uuid`. The users table key is an integer, so telemetry stores `UserID` = `str(users.id)` and does not copy the `user_uuid` column name.

`OrderType` in `services/api/schemas.py` is `INBOUND` or `OUTBOUND`, with line items `{product_id, quantity}`. One telemetry event is emitted **per line** after the order row commits, because the weekly pipeline sums a single `cost` per event and groups by one `location_id`. `order_id` ties the lines together. `product_id` on the event is the integer inventory id; if the pydantic body sends a numeric string, parse it with `int` before emit.

Inbound lines are supplier receipts. Outbound lines are kitchen consumption or transfers. A transfer sets `destination_location_id` to a roster id other than `location_id`. Guest checks are `sale_completed`. Outbound orders record stock leaving the kitchen.

### Location, sale, supplier, loyalty

Locations are the roster above (`GET /locations`). Sales, menus, customers, and suppliers are still missing on the central API (`memory-bank/Progress.md`). Their events are specified so the router that adds them can emit on the first write. Menu lines on a sale use `menu_item_name` (a guest-facing dish such as “Grilled Sirloin”). They are not inventory `product_id`s. Ingredient depletion stays on outbound orders and waste events.

`supplier_id` matches `^sup_[a-z0-9_]{2,64}$`. Mint one stable id per supplier (the briefing’s count is about 20, split across the two markets) and reuse it on every receipt.

## Phase 1 — Mandatory baseline and identified opportunities

Two groups, and only two. **Mandatory** means `CONTEXT.md` states the need in a department’s “What they need” or “What she needs”, or it states the question the dashboard exists to answer (covers today in Medellín downtown, a slow week at the Miami restaurant, Florida week sales, highest average ticket). **Identified opportunity** means this plan found the signal in the running application, in a problem sentence that is not itself the need, or in an operating procedure. An opportunity never replaces a mandatory row. A mandatory metric whose writer is not live yet is published as null. Omitting a mandatory row is a plan violation.

The Monday report (`weekly_report_dispatched`) lists every mandatory id in `floor_metric_ids`. The natural-language assistant reads these same ids. It does not keep a second definition of Florida week sales or of average ticket.

### Mandatory metrics (`CONTEXT.md`)

| Id | `CONTEXT.md` requirement | Formula | Grain |
| --- | --- | --- | --- |
| `ops.sales.gross_native` | Real-time sales dashboard per location, in COP and in USD | Sum of `sale_completed.amount` for that location. Colombia locations stay in COP. Florida locations stay in USD. A new ticket is visible within 5 minutes | Location × `business_date` |
| `ops.sales.covers` | How many covers were served today at the Medellín downtown location | Sum of `covers`. The API binding for Medellín downtown is `co-med-centro` | Location × `business_date` |
| `ops.sales.slow_week` | Whether the Miami restaurant is having a slow week. The same test runs for every location | Native sales in the current chain week compared with the previous full chain week. `slow_week` is true when current is lower. The worked example binds “the Miami restaurant” to `us-mia-downtown` | Location × chain week |
| `ops.sales.average_ticket` | Average ticket, the input to Mariana’s monthly question | `sum(amount) / count(sale_completed)` in the location currency | Location × calendar month in the location timezone |
| `exec.ticket.top_location` | Which location has the highest average ticket this month | Highest `ops.sales.average_ticket`. Publish a ranking inside COP and a ranking inside USD, plus one chain answer ranked on `amount_usd` where `fx_status` is `recorded`. The single location she asks for is the converted ranking, with the currency basis named beside it | Calendar month |
| `ops.sales.silence` | Alert when a location shows no sales during opening hours | One open `location_sales_silence_detected` episode. `CONTEXT.md` does not publish the hours. The 11:00–22:00 window and the 45-minute gap are the v1 binding in this plan | Location, while open |
| `ops.ordering.on_hand` | Current stock for ingredient ordering | Latest `quantity_after` per product. Location-scoped stock uses the location. Until `products.csv` has a location, the CSV quantity is chain on-hand and is labeled `chain` | Product × location, or product × chain |
| `ops.ordering.suggested_qty` | Ingredient ordering from historical sales and current stock | `max(0, daily_demand × days_until_next_delivery − on_hand)`. `daily_demand` is trailing 28 location-days of sale-line quantity mapped through the recipe bill of materials to `product_id`, divided by 28. When that bill of materials is missing, the value is null. Delivery days in the cadence table are an opportunity binding, not a `CONTEXT.md` rule | Location × product |
| `proc.price.history` | Supplier price history | `unit_price` on each `inbound_order_created` for the same `product_id`, `supplier_id`, and `currency`, ordered by `timestamp` | Supplier × product × currency |
| `proc.price.alerts` | Alert when a raw-material price changes, before the invoice is the only notice | Count of `ingredient_price_variance_detected`, per location and rolled up by `supplier_id` | Chain week |
| `proc.purchase.consolidated` | Consolidated purchasing across both markets for central negotiation | Sum of inbound `cost` grouped by `country`, and again by `supplier_id`. COP and USD stay in separate totals. The same events grouped by `location_id` are the location view inside that consolidation | Chain week |
| `mkt.customers.identified_rate` | Who Brasaland’s customers are | `sale_completed` with `customer_id` / all `sale_completed` | Country × chain week |
| `mkt.customers.order_history` | CRM order history | `sale_completed` rows for one `customer_id`, ordered by `timestamp`, including menu lines | Customer |
| `mkt.customers.preference_coverage` | CRM preferences | Distinct `customer_id` on `customer_preference_recorded` / distinct `customer_id` on sales. Null when no customer is identified yet. The row stays visible | Chain week |
| `mkt.personalisation.accept_rate` | Suggestions based on behaviour | `recommendation_accepted` / `recommendation_shown`, joined on `recommendation_id` | Country × chain week |
| `mkt.orders.digital_share` | Digital ordering (the website takes no orders today) | `sale_completed` with `channel` `digital_app` / all `sale_completed` | Country × chain week |
| `mkt.loyalty.attach_rate` | Brasa Points participation. Stamp cards generate no data, and 60% of customers do not use them | `loyalty_attached` true / all `sale_completed` | Country × chain week |
| `people.turnover` | Turnover, segmented by country | Separations in the calendar month / average daily headcount that month × 100. A person counts on a day when `employee_hired.effective_date` is on or before that day and no `employee_separated` is on or before that day. Colombia and the United States are always both present. A country with no hire history is null | Country × month |
| `people.absenteeism` | Absenteeism, segmented by country | Sum of `absence_recorded.day_fraction` / count of `roster_day_scheduled` × 100 | Country × month |
| `people.time_to_fill` | Vacancy fill times, segmented by country | Mean and median of `days_to_fill` on `vacancy_filled`. `days_to_fill` is `filled_on` minus `opened_on` in calendar days | Country × month |
| `people.holiday.requests` | An HR portal for holiday requests | Counts of requests opened, approved, and declined, by country. No event in this pack yet. Publish null until the portal exists. A holiday day that was taken still counts inside `absence_recorded` | Country × month |
| `people.onboarding.completion` | An automated onboarding flow for new kitchen staff | Share of `employee_hired` with `employment_basis` `kitchen` who finish the onboarding path, and days from `effective_date` to completion. No completion event yet. Publish null | Country × month |
| `train.update.coverage` | Push a recipe update to all 14 locations | For each `recipe_update_published`, distinct acknowledging locations for that `recipe_id` and `version`, divided by 14. The week’s value is the minimum of those ratios. Target is 1 | Recipe version |
| `train.catalogue.search_hit_rate` | A searchable recipe catalogue | Searches that open a recipe / searches. No search event yet. Publish null | Chain week |
| `train.onboarding.path_completion` | A structured onboarding path for new staff | Share of new hires who finish the recipe steps of the onboarding path. No step event yet. Publish null. This is the Training path. `people.onboarding.completion` is the People flow | Chain week |
| `tech.locations.live` | Real-time telemetry from each location | During the v1 open window, a location is live when it has a `sale_completed` or a `location_sales_silence_detected` with `evaluated_at` in the last 15 minutes. The 15-minute rule is a plan binding. Value = live locations / 14 | Instant |
| `tech.api.noun_coverage` | Central API covering locations, menus, sales, customers, and suppliers | Count of those five nouns present on the running OpenAPI document. Inventory does not fill a missing noun | Each check |
| `tech.dashboards.fed` | Pipeline into the operations, marketing, and finance dashboards | 3 when the latest Monday report includes every mandatory `ops.*` id, every mandatory `mkt.*` id, and both `finance.*` ids. Otherwise the count of those three audiences that are complete | Each Monday report |
| `exec.chain.sales` | Total chain sales in USD and in COP | Sum of `amount` grouped by `currency` for the chain week. Two numbers | Chain week |
| `exec.florida.week_sales` | How much did we sell this week in Florida? | Sum of `amount` where `country` is United States, chain week. Currency USD | Chain week |
| `exec.report.on_time` | Weekly report generated and sent every Monday at 7am | `weekly_report_dispatched` with `on_time` true. `week_start` is the previous Monday. `dispatched_at` is at or before Monday 07:00 America/Bogota, which is 12:00 UTC. `floor_metric_ids` lists every id in this table | Each Monday |
| `exec.assistant.named_questions` | AI assistant she can query in natural language | The assistant answers the Florida week question from `exec.florida.week_sales` and the average-ticket question from `exec.ticket.top_location` | The two named questions |
| `finance.sales.native` | The pipeline feeds the finance dashboards. Sales are the chain sales `CONTEXT.md` already requires, in USD and in COP | Same calculation as `exec.chain.sales`, read by finance | Chain week |
| `finance.purchases.native` | The same finance dashboards. Purchasing is the consolidated supplier spend | Same calculation as `proc.purchase.consolidated`, read by finance | Chain week |

`customer_id` on `sale_completed` matches `^cus_[A-Za-z0-9]{8,}$`. Staff and customer names, emails, phones, and national ids stay off the event. `employee_id` matches `^emp_[A-Za-z0-9]{6,}$`.

### Evaluation — every `CONTEXT.md` need is on the floor

Source file is root [`CONTEXT.md`](../../CONTEXT.md) (“Welcome to Brasaland”). There is no separate `context-company.md` in this monorepo; that briefing is `CONTEXT.md`.

**Verdict:** every mandatory metric above is present, labeled mandatory, listed in `weekly_report_dispatched.floor_metric_ids`, and matched in `definitions.mandatoryMetricSet`. Plan ids, schema enum, and floor example are the same 34 strings. Four floor ids publish `null` until a writer exists (`people.holiday.requests`, `people.onboarding.completion`, `train.catalogue.search_hit_rate`, `train.onboarding.path_completion`); omitting them would be a plan violation.

| `CONTEXT.md` need (department) | Mandatory metric ids | Correctly identified? |
| --- | --- | --- |
| Real-time sales dashboard per location in COP and USD (Operations) | `ops.sales.gross_native` | Yes — native currency per location, minutes freshness |
| Covers today at Medellín downtown (Operations question) | `ops.sales.covers` | Yes — bound to `co-med-centro` |
| Slow week at the Miami restaurant (Operations question) | `ops.sales.slow_week` | Yes — bound to `us-mia-downtown`, runs for all 14 |
| Intelligent ingredient ordering from historical sales and current stock (Operations) | `ops.ordering.on_hand`, `ops.ordering.suggested_qty` | Yes — stock plus sales→BOM demand; null without BOM |
| No-sales alert during opening hours (Operations) | `ops.sales.silence` | Yes — stream silence episode |
| Supplier price history and alerts (Procurement) | `proc.price.history`, `proc.price.alerts` | Yes |
| Consolidated purchasing across both markets (Procurement) | `proc.purchase.consolidated` | Yes — COP and USD kept separate |
| Who customers are; CRM order history and preferences (Marketing) | `mkt.customers.identified_rate`, `mkt.customers.order_history`, `mkt.customers.preference_coverage` | Yes |
| Personalisation from behaviour (Marketing) | `mkt.personalisation.accept_rate` | Yes |
| Digital loyalty and ordering app (Marketing) | `mkt.loyalty.attach_rate`, `mkt.orders.digital_share` | Yes — participation and digital channel share; stamp-card earn rates stay opportunities |
| Holiday requests and absence management (People) | `people.holiday.requests`, `people.absenteeism` | Yes — holiday portal null until built; absences via `absence_recorded` |
| Automated onboarding (People) | `people.onboarding.completion` | Yes — null until completion writer exists |
| Turnover, absenteeism, vacancy fill times by country (People) | `people.turnover`, `people.absenteeism`, `people.time_to_fill` | Yes — country grain |
| Searchable recipe catalogue (Training) | `train.catalogue.search_hit_rate` | Yes — null until search writer exists |
| Structured onboarding path for new staff (Training) | `train.onboarding.path_completion` | Yes — null until step writer exists; distinct from People onboarding |
| Push recipe updates to all 14 locations (Training) | `train.update.coverage` | Yes — acknowledgements / 14 |
| Central API: locations, menus, sales, customers, suppliers (Technology) | `tech.api.noun_coverage` | Yes — five nouns; inventory does not substitute |
| Real-time telemetry from each location (Technology) | `tech.locations.live` | Yes |
| Pipeline into operations, marketing, and finance dashboards (Technology) | `tech.dashboards.fed`, `finance.sales.native`, `finance.purchases.native` | Yes |
| Chain sales in USD and COP (Executive) | `exec.chain.sales` | Yes — two currency totals |
| Florida week sales; highest average ticket (Executive questions) | `exec.florida.week_sales`, `ops.sales.average_ticket`, `exec.ticket.top_location` | Yes |
| AI assistant in natural language (Executive) | `exec.assistant.named_questions` | Yes — those two questions |
| Weekly report Monday 7am (Executive) | `exec.report.on_time` | Yes — `weekly_report_dispatched` |

Optional multilingual support in Training is **not** a mandatory need (`CONTEXT.md` says optional). It is opportunity metric `train.locale.coverage`.

### Evaluation — opportunity catalog is broad (business + technical)

The opportunity set is not a token minimum. Counts that must stay above a checklist:

| Lens | What the plan covers | Evidence |
| --- | --- | --- |
| Business / inventory | Stockouts, overstock, waste bands, protein cover, emergency purchase, delivery lateness, supplier active count, kitchen ticket minutes, shift close | Opportunity metrics `ops.stockout.*`, `ops.waste.*`, `ops.protein.*`, `proc.*`; events `stock_threshold_*`, `stock_waste_registered`, `outbound_order_created`, `direct_stock_edit_rejected` |
| Marketing beyond the floor | Earn/redeem rates, tiers, card transfer, site traffic, 2.8 rating baseline | `mkt.loyalty.*` opportunity metrics; `loyalty_points_redeemed`, `loyalty_card_transferred`, `page_viewed` |
| Authentication | Login success/failure, form rejects, expiry, invalid/missing token, logout vs kick, restore | Events `user_login_*`, `auth_form_rejected`, `session_*`, `account_updated`; questions `bo.auth.*` |
| Performance | Staff API duration and panel/form clocks | Events `api_latency_recorded`, `ui_latency_recorded`; questions `bo.perf.*` |
| Errors | API 500/503, client exceptions, inventory validation and refused stock edits | Events `api_error_raised`, `client_exception_caught`, `inventory_validation_failed`, `direct_stock_edit_rejected`; `tech.errors.by_type`, `bo.ui.uncaught` |
| Navigation | Required ops sections, abandon rates, placeholder executive sales, public home | Events `section_viewed`, `flow_step_recorded`, `page_viewed`; questions `bo.nav.*` |

Floor size is 34 mandatory metrics. Beside that, the plan keeps **34** identified-opportunity metrics, **11** `bo.*` console questions (explicitly off the floor), **18** mandatory events, and **23** opportunity events. That is the broad catalog expected for Brasaland Digital, not a five-item formality list.

### Identified opportunity metrics

These are not in the “What they need” lines. They come from a problem sentence, the knowledge base, or the running application. They stay in the catalog. They are not listed in `floor_metric_ids`.

| Id | Where it comes from | Signal |
| --- | --- | --- |
| `ops.sales.tickets` | Denominator of average ticket | Count of `sale_completed` per location per day |
| `ops.stockout.count` | Problem sentence: overstock in some locations and stockouts in others. The stated need is the ordering system | Count of `stock_threshold_triggered` |
| `ops.stock.overstock` | Same problem sentence, the overstock half | On-hand above `suggested_qty` plus the days until the next delivery |
| `ops.shift.closed` | Paper or Excel shift reports sent to HR weekly | One shift-close record per location: sales, covers, waste, staff on duty |
| `ops.order.channel_mix` | Ingredient orders placed by WhatsApp or phone | Share of inbound lines with a recorded `supplier_id` versus lines still flagged manual |
| `ops.kitchen.ticket_minutes` | A kitchen that moves fast | Minutes from ticket open to `sale_completed` |
| `ops.waste.ratio` | Waste protocol, weekly pipeline field | `waste_cost / purchase_cost` per location per chain week, 4 decimal places |
| `ops.waste.monthly_rate` | Keep waste under 4% of monthly ingredient cost; 6% for two months starts an improvement plan | Monthly sum of waste `cost` / sum of purchase `cost` in the location timezone. Do not average the weekly ratios |
| `ops.waste.premium_escalation` | Premium protein (tenderloin, ribs) over 5 kg in a week goes to Felipe | Sum of kg where `protein_class` is `premium_protein` |
| `ops.waste.shrinkage_streak` | Three consecutive weeks of unexplained shrinkage | A week counts when it has one `unexplained_shrinkage` waste event |
| `ops.shrinkage.rate` | Unexplained shrinkage above 3% of weekly inventory | `shrink_qty / (opening_qty + inbound_qty)`. Skip with `insufficient_snapshot` when opening quantity is missing |
| `ops.protein.cover_days` | At least 3 days of main protein | On-hand / trailing 28-day daily usage. Feeds `stock_threshold_triggered` with reason `protein_cover_below_3_days` |
| `proc.purchase.emergency_rate` | Emergency orders, 8% surcharge, Procurement Manager approval above 500 USD | Emergency inbound lines / all inbound lines, plus `approval_state` |
| `proc.delivery.lateness` | 48-hour, 24-hour, and 5-business-day delivery promises | Receipt `timestamp` minus order placement, against the cadence for `category` |
| `proc.supplier.active_count` | About 20 suppliers across both markets | Distinct `supplier_id` with an inbound line in the last 90 days |
| `mkt.loyalty.points_earned` | Knowledge-base earn rule. `CONTEXT.md` names Brasa Points and does not state the rate | `floor(amount / 10000)` COP, or `floor(amount / 10)` USD, stored on the sale |
| `mkt.loyalty.redeem_value` | Knowledge-base redeem rule | `points / 5 × 20000` COP, or `points / 5 × 20` USD, once `balance_before` is at least 15 |
| `mkt.loyalty.tier_mix` | Bronze, Silver, Gold benefits | Accounts by point balance bands 0–19, 20–49, 50+ |
| `mkt.loyalty.transfer_count` | One-time physical card to app | Count of `loyalty_card_transferred` |
| `mkt.loyalty.active_12m` | Points stay alive with one purchase per 12 months | Identified customers with a sale in the trailing 365 days |
| `mkt.site.page_views` | 2019 website, corporate home | `page_viewed` where `app` is `website` |
| `mkt.app.rating_baseline` | 2.8 app store rating | External store rating. Record the 2.8 baseline beside `mkt.orders.digital_share`. Do not invent a scrape in this pack |
| `people.headcount` | About 115 people, shown as a level beside the mandatory turnover rate | The daily headcount series already required by `people.turnover` |
| `people.turnover.early_kitchen` | Kitchen staff turn over frequently | Separations whose matching hire has `employment_basis` `kitchen` and whose separation falls within 14 days of that hire’s `effective_date`, divided by kitchen hires |
| `train.locale.coverage` | Spanish and English are optional in `CONTEXT.md` | Recipes whose latest version has an `es` publish, and the share that also have `en` |
| `train.update.hours_to_14` | Updates that today take days | Hours from `recipe_update_published` to the 14th acknowledgement |
| `tech.traffic.events_per_day` | Engineering report already sketched in the repo | Count of stored rows by UTC date |
| `tech.errors.by_type` | API instability | Count of `api_error_raised` by `code` |
| `tech.auth.failure_rate` | Sign-in failures | `user_login_failed / (user_login_failed + user_login_succeeded)` per UTC date |
| `tech.pipeline.run_success` | Monday pipeline actually ran | `records_processed` and status on the weekly run. Zero rows means collection failed |
| `exec.chain.week_change` | Unified dashboard beyond the two named questions | Chain-week native sales versus the previous chain week, per currency |
| `exec.revenue.run_rate` | About USD 6 million annual revenue | Trailing 52 chain weeks of `amount_usd` where `fx_status` is `recorded`, labeled converted |
| `finance.food_cost` | Finance view of margin | `(purchase cost + waste cost) / sales`, computed inside COP and again inside USD |
| `finance.fx.coverage` | Converted chain totals | Share of COP money events with `fx_status` `recorded` |

## Formula detail

The notes below keep pipeline rounding and the opportunity waste rules next to the events that feed them. “Chain week” and “location day” are defined in the clock section. Mandatory formulas are the table above. Rows here that are not in that table are identified opportunities.

Grain, formula, and the events that feed the number.

| Id | Question it answers | Formula | Grain | Freshness | Events |
| --- | --- | --- | --- | --- | --- |
| `exec.chain.sales` | How much did we sell this week, in Florida and across the chain? | Sum of `amount` grouped by `currency`. Florida = `country` United States. Converted rollup = sum of `amount_usd` where `fx_status` is `recorded` | Chain week | Hourly once `sale_completed` exists | `sale_completed` |
| `ops.sales.gross_native` | Sales today at one location, in that location’s currency | Sum of `amount` | Location × `business_date` | Minutes | `sale_completed` |
| `ops.sales.covers` | Covers served | Sum of `covers` | Location × `business_date` | Minutes | `sale_completed` |
| `ops.sales.tickets` | Distinct tickets | Count of `sale_completed` | Location × `business_date` | Minutes | `sale_completed` |
| `ops.sales.average_ticket` | Highest average ticket this month | `sum(amount) / count(sale_completed)` in the location currency. Publish the currency beside the number | Location × calendar month in the location timezone | Nightly | `sale_completed` |
| `ops.sales.silence` | A location is open and has no sales | See silence monitor | One open episode per location | Every 5 minutes | `location_sales_silence_detected` |
| `proc.purchase.cost` | What did this location buy this week? | Sum of `properties.cost` on `inbound_order_created` | Location × chain week | Weekly pipeline, Monday 07:00 | `inbound_order_created` |
| `ops.waste.cost` | Waste cost | Sum of `properties.cost` on `stock_waste_registered` | Location × chain week | Weekly pipeline | `stock_waste_registered` |
| `ops.waste.ratio` | Waste versus purchases (pipeline field `waste_ratio`) | `waste_cost / purchase_cost` when purchase cost > 0, else `0`. Round to 4 decimal places, matching `aggregate_location_kpis` | Location × chain week | Weekly pipeline | the two events above |
| `ops.waste.monthly_rate` | Keep waste under 4% of monthly ingredient cost; 6% for two months starts an improvement plan | Sum waste `cost` / sum purchase `cost` for the calendar month in the **location** timezone. Compare the ratio to `0.04` (target) and `0.06` (improvement plan if both of the last two months exceed it). Average the weekly ratios is the wrong aggregation | Location × calendar month | Monthly | inbound + waste |
| `ops.stockout.count` | Stockout frequency | Count of `stock_threshold_triggered` | Location × chain week | Weekly pipeline | `stock_threshold_triggered` |
| `proc.price.alerts` | Price moved before the invoice is a surprise | Count of `ingredient_price_variance_detected` | Location × chain week | Weekly pipeline | `ingredient_price_variance_detected` |
| `ops.protein.cover_days` | At least 3 days of main protein on hand | `on_hand / (trailing_28_location_days_usage / 28)`. Usage is the sum of `quantity` on `outbound_order_created` with `reason` `kitchen_consumption` and `protein_class` `main_protein` or `premium_protein`, plus `stock_waste_registered` for the same classes. Emit when cover < 3 and usage > 0 | Location × product | Hourly | outbound, waste, then `stock_threshold_triggered` with `reason` `protein_cover_below_3_days` |
| `ops.shrinkage.rate` | Unexplained shrinkage above 3% of weekly inventory | `shrink_qty / (opening_qty + inbound_qty)` for `waste_category` `unexplained_shrinkage`. `opening_qty` is the latest `quantity_after` on `stock_count_adjusted` for that product and location before the chain week starts. If that snapshot is absent, skip the alert (record `insufficient_snapshot` in the monitor log) and keep the waste events | Location × product × chain week | Weekly | waste + stock counts + inbound |
| `ops.waste.premium_escalation` | Premium protein waste over 5 kg in a week goes to Felipe Guerrero | Sum of `quantity` where `protein_class` is `premium_protein`, `unit` is `kg`, one location, one chain week. Escalate when the sum is **greater than 5** | Location × chain week | Weekly | `stock_waste_registered` |
| `ops.waste.shrinkage_streak` | Three consecutive weeks of unexplained shrinkage at the same location | A week counts when it has at least one `unexplained_shrinkage` waste event for that location | Location | Weekly | `stock_waste_registered` |
| `mkt.loyalty.attach_rate` | Who is actually in Brasa Points (stamp cards produce no rows) | `sale_completed` with `loyalty_attached` true / all `sale_completed` | Chain week, split by country | Daily | `sale_completed` |
| `mkt.loyalty.points_earned` | Points from spend | `floor(amount / 10000)` when currency is COP. `floor(amount / 10)` when currency is USD. The producer writes the integer on the sale | Per ticket | With the sale | `sale_completed` |
| `mkt.loyalty.redeem_value` | 5 points = 20,000 COP or 20 USD | `points / 5 * 20000` COP or `points / 5 * 20` USD. Redeem in multiples of 5 | Per redemption | With the redemption | `loyalty_points_redeemed` |
| `tech.traffic.events_per_day` | Platform volume for the engineering report | Count of rows by UTC date | UTC day | The engineering reader’s window | every stored event |
| `tech.errors.by_type` | Instability | Count of `api_error_raised` grouped by `code` | Reader window | Same | `api_error_raised` |
| `tech.auth.failure_rate` | Sign-in failures | `user_login_failed / (user_login_failed + user_login_succeeded)` per UTC date. The reader in `skills/data-analysis/scripts/pandas_clean.py` already expects these two `event_type` values | UTC day | Same | login events |
| `people.turnover` | Leavers versus headcount, by country | Phase 1 formula. Separations / average daily headcount × 100 | Country × month | Monthly | `employee_hired`, `employee_separated` |
| `people.absenteeism` | Absence, by country | Phase 1 formula. Absence fractions / scheduled roster days × 100 | Country × month | Monthly | `absence_recorded`, `roster_day_scheduled` |
| `people.time_to_fill` | Vacancy fill time, by country | Phase 1 formula. Mean and median of `days_to_fill` | Country × month | Monthly | `vacancy_opened`, `vacancy_filled` |

The three People KPI formulas above are mandatory. The events are `employee_hired`, `employee_separated`, `absence_recorded`, `roster_day_scheduled`, `vacancy_opened`, and `vacancy_filled`. There is no HR router in the running API yet. The events stay, because turnover, absenteeism, and vacancy fill time are in `CONTEXT.md`.

### Clocks

| Clock | Definition | Used by |
| --- | --- | --- |
| `timestamp` | ISO 8601 UTC instant of the business fact | Storage columns `created_at` and `timestamp` |
| `business_date` | Calendar date in the location timezone | Per-location day metrics (“covers today in Medellín Centro”) |
| Chain week | `[Monday 00:00, next Monday 00:00)` America/Bogota | `proc.*` weekly pipeline, Mariana’s Monday report, “this week in Florida” |
| Calendar month | Month boundaries in the **location** timezone | Average ticket, monthly waste rate |

Example chain week reported at Monday 2026-09-28 07:00 America/Bogota: `week_start` `2026-09-21`, UTC window `[2026-09-21T05:00:00Z, 2026-09-28T05:00:00Z)`. Pass those instants to `POST /reporting/pipeline-runs` as `start_date` and `end_date`. The extractor filters `created_at` with `gte` start and `lt` end.

Supplier cadence (for monitors that compare a receipt to the expected rhythm; the receipt itself is still `inbound_order_created`):

| `category` | Expectation from `docs/company-knowledge-base/brasaland-supplier-ordering.en.md` |
| --- | --- |
| `proteins` | Weekly order, 48-hour delivery |
| `vegetables_fruit` | Monday and Thursday, 24-hour delivery |
| `beverages_packaging` | Every two weeks, 5 business-day delivery |
| `imported_sauces` | Monthly, 10 to 15 business days, Colombia imports |
| `cleaning` | Named in `CONTEXT.md`; the procedure does not set a cadence |
| `other` | Anything else |

Emergency inbound (`order_kind` `emergency`): `surcharge_rate` is `0.08` and `cost` is the charged amount (`list_cost * 1.08`, rounded to 2 decimal places). Scheduled inbound uses `surcharge_rate` `0` and `cost` = `list_cost`. `approval_required` is true when `order_kind` is `emergency` and (`amount_usd` > 500 or `fx_status` is `missing`). At exactly 500 USD, `approval_required` is false. The approver role is Procurement Manager.

Waste notes: when `protein_class` is `main_protein` or `premium_protein`, `unit` is `kg`, and `quantity` > 2, `note` is required (the shift log for more than 2 kg of meat protein). `premium_protein` means tenderloin or ribs, as in the waste protocol. Training waste in an employee’s first 14 days may set `training_waste` true; the note rule still applies.

Price alert: after an inbound line is priced, load the previous `unit_price` for the same `product_id`, `supplier_id`, and `currency`. Emit `ingredient_price_variance_detected` when a previous price exists and `abs(unit_price - previous_unit_price) / previous_unit_price >= 0.01`. The first price for that key is stored and does not emit an alert. `variance_pct` = `(unit_price - previous_unit_price) / previous_unit_price`.

## Event taxonomy (`entity_action`)

Every `Event_type` is `entity` + `_` + `action`. Verbs are drawn from this closed list so dashboards and the engineering reader can group by action without a second dictionary:

`created`, `adjusted`, `crossed`, `cleared`, `triggered`, `registered`, `detected`, `completed`, `recorded`, `shown`, `accepted`, `hired`, `separated`, `scheduled`, `opened`, `filled`, `published`, `acknowledged`, `dispatched`, `redeemed`, `transferred`, `succeeded`, `failed`, `rejected`, `ended`, `viewed`, `expired`, `raised`, `caught`, `updated`.

Examples that match this contract: `inbound_order_created`, `stock_threshold_triggered`, `direct_stock_edit_rejected`, `session_expired`, `api_latency_recorded`.

## Complete schemas in `event-schemas.json`

`docs/telemetry/event-schemas.json` is a **JSON Schema draft-07** document (`"$schema": "http://json-schema.org/draft-07/schema#"`). Validate producer documents with a draft-07 implementation (for example `jsonschema.Draft7Validator`) with format checking on.

Document structure:

| Key | Role |
| --- | --- |
| `$schema` | `http://json-schema.org/draft-07/schema#` |
| `$id` | `https://brasaland.digital/telemetry/event-schemas.json` |
| `oneOf` | Exactly one branch per catalog event; each entry is `{"$ref": "#/definitions/<EventKey>"}` |
| `definitions` | Shared and per-event schemas (`envelope`, camelCase event keys, `mandatoryMetricObservation`, `mandatoryMetricSet`, …) |
| `definitions.<Event>.examples` | Valid instances of that event (and of `mandatoryMetricSet`) |

`$ref` values use the draft-07 form `#/definitions/...` (not `#/$defs/...`). Each event’s `properties` object sets `additionalProperties: false` so the property allowlist is machine-enforced.

`definitions` holds one JSON Schema (draft-07) per catalog event, plus:

| `definitions` key | What it validates |
| --- | --- |
| `envelope` | The eight mandatory envelope fields plus `source` and `tags` |
| every event camelCase key | That event’s `Event_type`, allowed `source` values, and `properties` |
| `mandatoryMetricObservation` | One published value for a `CONTEXT.md` mandatory metric (`metric_id`, `value`, `grain`, `status`, `as_of`) |
| `mandatoryMetricSet` | Exactly the 34 mandatory metric ids, one observation each. `status` `null_pending_writer` forces `value` null |

The 18 mandatory events below are the complete producer schemas for every `CONTEXT.md` metric that already has a writer. Holiday requests, onboarding completion, catalogue search, and the training onboarding path stay in `mandatoryMetricSet` with `null_pending_writer` until a writer exists.

### Additional opportunity schemas by category

At least eight opportunity events, across at least three categories, have full schemas in the same file:

| Category | `Event_type` (schema complete) |
| --- | --- |
| Business / inventory | `direct_stock_edit_rejected`, `stock_threshold_triggered`, `stock_threshold_crossed`, `inventory_validation_failed`, `stock_waste_registered`, `outbound_order_created` |
| Authentication | `session_expired`, `session_rejected`, `user_login_succeeded`, `user_login_failed`, `auth_form_rejected`, `session_ended` |
| Performance | `api_latency_recorded`, `ui_latency_recorded` |
| Errors | `api_error_raised`, `client_exception_caught` |
| Navigation | `section_viewed`, `flow_step_recorded`, `page_viewed` |

## Event catalog

Every event is in one group. Mandatory events are the ones a `CONTEXT.md` need cannot be computed without. Identified opportunities are the rest of the application and the operating procedures. Holiday requests, onboarding completion, catalogue search, and the onboarding path are mandatory metrics with no event yet. They are published as null. They are not given a placeholder event.

### Mandatory events

| `event_type` | `CONTEXT.md` need it serves | `location_scope` | Producer | Pipeline reads it? |
| --- | --- | --- | --- | --- |
| `product_created` | Current stock for ingredient ordering. The ingredient has to exist | `chain` today; `location` once the row has a location | `services.api.inventory` `create_product` | No |
| `stock_count_adjusted` | Current stock for ingredient ordering | `chain` or `location` | `services.api.inventory` `apply_delta` | No |
| `inbound_order_created` | Supplier price history and consolidated purchasing across both markets | `location` | Future order writer, one event per inbound line | Yes — sums `cost` into `total_purchase_cost` |
| `ingredient_price_variance_detected` | Alert when a raw-material price changes, before the invoice is the only notice | `location` | Same transaction as the inbound line that changed price | Yes — counted |
| `sale_completed` | Sales per location in COP and USD; covers; slow week; average ticket; Florida week sales; chain sales; who customers are; order history; digital ordering; Brasa Points participation | `location` | Future sales writer, one event per closed ticket | No (executive, operations, marketing, and finance readers) |
| `location_sales_silence_detected` | Alert when a location shows no sales during opening hours | `location` | `services.telemetry.silence_monitor` | No |
| `customer_preference_recorded` | CRM preferences | `none` | `services.api.customers` | No |
| `recommendation_shown` | Personalisation based on behaviour. The offer has to have been shown | `location` | `services.api.recommendations` | No |
| `recommendation_accepted` | Personalisation based on behaviour. The guest took the suggestion | `location` | `services.api.recommendations` | No |
| `employee_hired` | Turnover by country, and the onboarding denominator | `none` | `services.api.people` | No |
| `employee_separated` | Turnover by country | `none` | `services.api.people` | No |
| `absence_recorded` | Absenteeism by country, and absence management | `none` | `services.api.people` | No |
| `roster_day_scheduled` | Absenteeism by country. The rate needs scheduled days | `none` | `services.api.people` | No |
| `vacancy_opened` | Vacancy fill times by country. The clock starts here | `none` | `services.api.people` | No |
| `vacancy_filled` | Vacancy fill times by country | `none` | `services.api.people` | No |
| `recipe_update_published` | Push a recipe update to all 14 locations | `none` | `services.api.training` | No |
| `recipe_update_acknowledged` | The location confirms that update | `location` | `services.api.training` | No |
| `weekly_report_dispatched` | Weekly report generated and sent every Monday at 7am | `none` | `services.telemetry.weekly_report` | No |

### Identified opportunity events

| `event_type` | Where it was found | `location_scope` | Producer | Pipeline reads it? |
| --- | --- | --- | --- | --- |
| `stock_threshold_crossed` | Live chain CSV and the default alert threshold of 10 in `get_alerts` | `chain` | `apply_delta` when quantity crosses from ≥ 10 to < 10 | No |
| `stock_threshold_cleared` | Same CSV, the count climbing back through 10 | `chain` | `apply_delta` when quantity crosses from < 10 to ≥ 10 | No |
| `outbound_order_created` | Declared `OUTBOUND` order in `services/api/schemas.py`. Kitchen consumption is not the sales history `CONTEXT.md` names | `location` | Future order writer, one event per outbound line | No |
| `stock_waste_registered` | Waste protocol and the weekly pipeline’s `total_waste_cost` | `location` | Waste log at shift close | Yes — sums `cost` into `total_waste_cost` |
| `stock_threshold_triggered` | Stockouts in the Operations problem sentence, and protein cover in the ordering procedure | `location` | Location-scoped stock edge, or the protein-cover monitor | Yes — counted |
| `loyalty_points_redeemed` | Knowledge-base redeem rule. `CONTEXT.md` does not state the points rate | `location` | Future loyalty writer | No |
| `loyalty_card_transferred` | Physical stamp cards that customers lose. The one-time move onto an app account | `location` | One-time physical card → app transfer | No |
| `user_login_succeeded` | Staff sign-in in `services/api/users.py` | `none` | `login` and `login_for_access_token` | No |
| `user_login_failed` | The 401 branches of those handlers | `none` | Same handlers | No |
| `api_error_raised` | HTTP 500 and 503 handlers in `services/api/errors.py` | `none` | `handle_unhandled_error`, `handle_external_service_error` | No |
| `page_viewed` | The 2019 corporate site, route `/` in `uis/website` | `none` | `uis/website` | No |
| `auth_form_rejected` | Login, register, password, and profile forms in `uis/backoffice` | `none` | Those forms, including the 422 they show | No |
| `session_expired` | JWT past `exp` during a protected request | `none` | `decode_access_token` on `ExpiredSignatureError` | No |
| `session_rejected` | Invalid token, inactive subject, or a protected page with no token | `none` | `decode_access_token`, `get_current_user`, `useRequireAuth` | No |
| `session_ended` | Logout, or a later 401 that clears `auth_token` | `none` | `BackofficeLayout` and `clearSessionAndRedirectToLogin` | No |
| `account_updated` | Register, `PUT /profiles/me`, `PUT /users/{id}` | `none` | Those three writes in the staff console | No |
| `api_latency_recorded` | Every `apiRequest` in `uis/backoffice/src/lib/api.ts` | `none` | That helper, including network failure | No |
| `ui_latency_recorded` | Session, panel, and form clocks in the staff console | `none` | `AuthProvider` and the page effects | No |
| `client_exception_caught` | `ErrorBoundary` in the backoffice and the website, plus `window` errors | `none` | Those listeners | No |
| `section_viewed` | Sidebar and the panels on `/accessible` | `none` | The page that actually paints the section | No |
| `flow_step_recorded` | Sign-in, register, session restore, profile, password, and the operations review | `none` | Those screen lifecycles | No |
| `inventory_validation_failed` | HTTP 422 on an inventory or order body, before any write | `none` | `handle_validation_error` | No |
| `direct_stock_edit_rejected` | A direct stock change the API refuses, leaving `products.csv` unchanged | `chain` | `apply_delta` or `get_alerts` | No |

## Why we capture each event

Each event that remains can finish this sentence. Its group is the table above: the first eighteen are mandatory, and the remaining twenty-three are identified opportunities. A point that could not name the decision was removed.

We capture `product_created` because we need to know a new ingredient landed in the chain inventory file, which allows us to make the decision, whether Felipe’s next order includes it or the row was a mistaken create that must be reversed before ordering.

We capture `stock_count_adjusted` because we need to know the on-hand quantity moved and by how much, which allows us to make the decision, whether the suggested order uses the new count or a large delta needs a recount before the order goes out.

We capture `stock_threshold_crossed` because we need to know the chain inventory file fell from at least 10 to under 10, which allows us to make the decision, to place or advance a purchase before a location runs out, since this CSV is the only live stock.

We capture `stock_threshold_cleared` because we need to know the same file climbed back to at least 10, which allows us to make the decision, to cancel a top-up that was started for the low count.

We capture `inbound_order_created` because we need to know what each location bought, from whom, and at what cost in COP or USD, which allows us to make the decision, whether Lucía consolidates or renegotiates that supplier and whether finance books the purchase.

We capture `outbound_order_created` because we need to know what the kitchen consumed or transferred, which allows us to make the decision, how much to reorder so cover stays ahead of the next delivery.

We capture `stock_waste_registered` because we need to know waste cost and premium-protein kilograms by location, which allows us to make the decision, whether a kitchen starts the improvement plan when waste exceeds 6% for two months, or Felipe is called for more than 5 kg of premium protein in a week.

We capture `stock_threshold_triggered` because we need to know a location crossed its stock or protein-cover line, which allows us to make the decision, to reorder that product at that location before the next scheduled delivery.

We capture `ingredient_price_variance_detected` because we need to know a supplier’s unit price moved by at least 1% before the invoice is the only notice, which allows us to make the decision, whether Lucía challenges that price or switches supplier on the next order.

We capture `sale_completed` because we need to know each location’s sales, covers, and currency, which allows us to make the decision, whether Florida’s week is behind and whether a location’s average ticket is the one Mariana asks about.

We capture `location_sales_silence_detected` because we need to know an open location has had no sale for 45 minutes, which allows us to make the decision, to call that location during service.

We capture `loyalty_points_redeemed` because we need to know points left a digital account and the discount in COP or USD, which allows us to make the decision, whether the points liability is large enough for finance to accrue and for Camila to keep the digital redeem rule.

We capture `loyalty_card_transferred` because we need to know a physical stamp card was moved onto an app account, which allows us to make the decision, whether the counter migration is working or Camila stops pushing transfers.

We capture `customer_preference_recorded` because we need to know which identified guests have a language or channel preference, which allows us to make the decision, to hold personalisation until that coverage is real.

We capture `recommendation_shown` because we need to know a suggestion was actually displayed, which allows us to make the decision, to score the accept rate on offers that rendered.

We capture `recommendation_accepted` because we need to know the guest took the suggested dish, which allows us to make the decision, to keep that suggestion surface or pull it when accepted stays low against shown.

We capture `employee_hired` because we need to know headcount gained by country, which allows us to make the decision, whether turnover in Colombia or the United States is a real rate or an empty denominator.

We capture `employee_separated` because we need to know who left and in which country, which allows us to make the decision, whether Ashley adds hiring in that country this month.

We capture `absence_recorded` because we need to know absence days by country, which allows us to make the decision, whether that country needs a larger on-duty buffer.

We capture `roster_day_scheduled` because we need to know how many days were scheduled, which allows us to make the decision, to publish absenteeism as a rate and to leave a country with an empty roster null.

We capture `vacancy_opened` because we need to know when a vacancy started, which allows us to make the decision, to start the fill clock Ashley reports by country.

We capture `vacancy_filled` because we need to know how many days the fill took, which allows us to make the decision, whether kitchen hiring in that country is too slow and the process has to change.

We capture `recipe_update_published` because we need to know which recipe version was pushed, which allows us to make the decision, which version all 14 kitchens are supposed to be cooking.

We capture `recipe_update_acknowledged` because we need to know which locations confirmed that version, which allows us to make the decision, to chase the kitchens still on the old recipe before service.

We capture `weekly_report_dispatched` because we need to know the Monday 07:00 report went out on time and listed every floor metric, which allows us to make the decision, whether Mariana uses that issue or Technology reruns the job.

We capture `user_login_succeeded` because we need to know a staff sign-in worked, which allows us to make the decision, to treat a rise in failures with flat successes as a password problem and a drop in both as an outage.

We capture `user_login_failed` because we need to know whether the password was wrong or the account is inactive, which allows us to make the decision, to send a reset or to reactivate the account with People.

We capture `api_error_raised` because we need to know the API returned 500 or 503, which allows us to make the decision, to fix that handler or hold a deploy.

We capture `page_viewed` because we need to know the public corporate home was opened, which allows us to make the decision, whether Camila treats the 2019 site as a live channel.

We capture `auth_form_rejected` because we need to know the form blocked the submit, which allows us to make the decision, to fix the form or the client check.

We capture `session_expired` because we need to know a 30-minute token died mid-task, which allows us to make the decision, to extend the access token lifetime or add a silent refresh before Felipe loses the inventory panel.

We capture `session_rejected` because we need to know a 401 was a broken token, an inactive subject, or a missing token, which allows us to make the decision, to rotate the signing secret, finish offboarding, or fix the deep link.

We capture `session_ended` because we need to know the operator logged out or was sent back to `/login`, which allows us to make the decision, to extend the 30-minute token when `rejected_session` is what interrupts the shift.

We capture `account_updated` because we need to know register, profile save, or password change finished or was refused, which allows us to make the decision, to send a duplicate email to sign-in, or to fix the permission or the write before People relies on that form.

We capture `api_latency_recorded` because we need to know which staff route was slow, failed, or unreachable, which allows us to make the decision, which endpoint to fix before Felipe is asked to trust the console, including a session check that never returned 200.

We capture `ui_latency_recorded` because we need to know how long the panel or form spun and whether the operator left mid-load, which allows us to make the decision, to fix the screen when the API call was fast, or to shorten the wait when the outcome is cancelled.

We capture `client_exception_caught` because we need to know which pathname threw and the error name, which allows us to make the decision, to hotfix that route before the next service or to defer a single account-page crash until after peak.

We capture `section_viewed` because we need to know which live staff surface was actually shown, including executive sales while it still has no numbers, which allows us to make the decision, to fix navigation when the roster or inventory never appears, and to withhold the sales dashboard from Mariana until that panel is ready.

We capture `flow_step_recorded` because we need to know which live staff flow was left unfinished and at which step, which allows us to make the decision, to fix that step before training people to finish the flow.

We capture `inventory_validation_failed` because we need to know a stock or order body was rejected before any write, which allows us to make the decision, to fix the client payload.

We capture `direct_stock_edit_rejected` because we need to know a direct quantity change was refused and the file did not change, which allows us to make the decision, to correct the product or the delta.

### Evaluation — justification, envelope, allowlists, schema consistency

**Verdict: PASS.**

| Criterion | Result |
| --- | --- |
| Every event has a hypothesis and a decision | All **41** catalog `Event_type` values have a “We capture … because we need to know … which allows us to make the decision …” sentence. None are retained “just in case.” Discarded candidates are listed under Phase 3 Risks. |
| Envelope consistent on every event | `$defs`/`definitions.envelope` requires `eventID`, `timestamp` (ISO 8601 UTC `…Z`), `sessionID`, `UserID`, `Event_type`, `SchemaVersion`, `requestID`, `properties` (plus `source` and `tags`). All 41 examples validate and carry those keys. |
| `Event_type` is `entity_action` | Every type uses the closed verb list (`created`, `rejected`, `expired`, `recorded`, …). |
| Property allowlist per event | [`property-allowlists.md`](property-allowlists.md) / [`.json`](property-allowlists.json) document every event. Schema `additionalProperties: false` on each `properties` object; allowlist keys match schema keys with zero mismatches. |
| `event-schemas.json` valid and aligned with the plan | JSON Schema draft-07; `Draft7Validator.check_schema` passes; plan catalog = schema `oneOf` = 41 types; floor metrics in the plan match `floor_metric_ids`. |

### Discarded

Discarded candidates and the privacy/cost exclusions are normative in **Phase 3 — Risks and exclusions**. Short list:

- `session_check_failed`. Covered by `api_latency_recorded` on `GET /auth/me`.
- Backoffice `page_viewed`. Staff visits are `section_viewed`.
- Section ids `suppliers`, `people`, `training`, and `reporting`. Not in the staff app.
- Flows `inventory_inbound` and `inventory_outbound`. No order form to abandon.

`data/pipelines/pipeline.py` `extract_telemetry_events` filters exactly these four types: `inbound_order_created`, `stock_waste_registered`, `stock_threshold_triggered`, `ingredient_price_variance_detected`. `scripts/nightly_export.py` copies only the first three. When that export is next edited, add `ingredient_price_variance_detected` so the CSV matches the extractor. The extractor reads Supabase itself; the CSV is not the aggregation input.

## Phase 2 — Event envelope

Every producer document uses this envelope. The eight fields below are mandatory on every event, including a job that has no person at the keyboard. Event-specific fields live only in `properties`. `source` and `tags` are also required, because the engineering reader selects `tags` and the pipeline joins on location facts copied into `tags`.

JSON keys are the names in this table. Casing is part of the contract.

| Field | JSON key | Rule |
| --- | --- | --- |
| eventID | `eventID` | UUID. Consumers dedupe on it. A silence episode reuses one `eventID` for the life of that episode. Storage column `id`. |
| timestamp | `timestamp` | ISO 8601, UTC, pattern `YYYY-MM-DDTHH:MM:SSZ`. No milliseconds. No offset other than `Z`. This is the business instant. |
| sessionID | `sessionID` | UUID of the browser session, or `null` when the emitter is a job with no session. Not a JWT and not `flow_instance`. The backoffice mints it when sign-in or session restore succeeds, keeps it in `sessionStorage`, and sends it as `X-Brasaland-Session`. Logout clears it. |
| UserID | `UserID` | Decimal `users.id` when the staff user is known, or `null` when nobody is authenticated. Never an email, a name, or a customer id. A guest’s `customer_id` stays in `properties`. |
| Event_type | `Event_type` | One catalog name, such as `sale_completed`. |
| SchemaVersion | `SchemaVersion` | Integer `1`. |
| requestID | `requestID` | UUID that ties together every event emitted for one HTTP request or one job run. The API reads `X-Request-ID` and generates a UUID when the header is missing. A client-only event mints its own UUID. Never null. |
| properties | `properties` | The event-specific object defined for that `Event_type`. Storage column `event_payload` is this object and nothing else. |

`source` is the producer module (`services.api.inventory`, `uis.backoffice`, and the other values in the schema). `tags` is the small copy below.

```json
{
  "eventID": "55555555-5555-4555-8555-555555555555",
  "timestamp": "2026-09-22T15:04:05Z",
  "sessionID": "02020202-0202-4202-8202-020202020202",
  "UserID": "3",
  "Event_type": "inbound_order_created",
  "SchemaVersion": 1,
  "requestID": "01010101-0101-4101-8101-010101010101",
  "source": "services.api.orders",
  "tags": {
    "source": "services.api.orders",
    "location_scope": "location",
    "location_id": "us-mia-downtown",
    "country": "United States",
    "currency": "USD"
  },
  "properties": {}
}
```

`properties` in that sketch is empty only to show the key. A real inbound line carries the fields in the event schema.

Who fills the nullable keys:

| Emitter | `sessionID` | `UserID` | `requestID` |
| --- | --- | --- | --- |
| Staff request that carries `X-Brasaland-Session` and a JWT | The header | `str(users.id)` | The request’s id |
| `user_login_succeeded` | The new session UUID | `str(users.id)`. This event may not send null | The login request’s id |
| `user_login_failed` before the user is known | null | null | The login request’s id |
| Public `page_viewed` on the corporate home | null | null | A UUID minted in the browser |
| Silence monitor, cover monitor, Monday report | null | null | One UUID for that run, shared by every event the run emits |
| Inventory call with no JWT | null | null | The request’s id |

## Storage row

Writers insert one row into Supabase table `telemetry_events`. The table columns stay the names the current readers already select. The envelope is mapped on the way in:

| Column | Value | Reader |
| --- | --- | --- |
| `id` | `eventID` | Engineering select in `skills/data-analysis/scripts/services/telemetry/main.py` |
| `event_type` | `Event_type` | Both |
| `timestamp` | Envelope `timestamp` | Engineering select |
| `created_at` | The same envelope `timestamp` | Pipeline `gte` / `lt` filter |
| `event_payload` | `properties` | Pipeline `location_id` and `cost` |
| `tags` | JSON `tags` | Engineering select |

`tags` is a copy, built only by this function, so the engineering reader and `properties` cannot drift:

```python
def build_tags(source: str, properties: dict) -> dict:
    tags = {"source": source, "location_scope": properties["location_scope"]}
    for key in ("location_id", "country", "currency"):
        if properties.get(key) is not None:
            tags[key] = properties[key]
    return tags
```

`properties.cost`, when present, is a JSON number in the location currency. The pipeline does `float(properties.get("cost", 0) or 0)` on the stored `event_payload`. Purchase and waste events always send `cost`. Price-alert and stockout events omit `cost`; the pipeline treats that as zero and only counts the rows.

### Emit algorithm

```text
emit(event):
  1. Validate the producer document against event-schemas.json (draft-07, format checks on). The document must carry eventID, timestamp, sessionID, UserID, Event_type, SchemaVersion, requestID, and properties.
  2. If validation fails: log a warning on logger "brasaland.telemetry" with Event_type and a one-line reason. Do not insert. Do not raise into the HTTP handler.
  3. Insert the storage row.
  4. If the insert fails: append the producer document as one JSON line to data/uploads/telemetry_outbox.jsonl (data/uploads/ is gitignored). Do not raise.
```

Retries reuse the same `eventID`. Consumers dedupe on `eventID`. A silence episode reuses one `eventID` for the life of that episode (`silence_started_at` + `location_id`). A new episode (after a `sale_completed`, or after the local close) gets a new `eventID`.

The outbox directory is `data/uploads/` because that path is already gitignored. A dedicated telemetry path needs a `.gitignore` edit, which this repo treats as a confirmed change.

## Phase 3 — Delivery strategy

Delivery mode is chosen from the **urgency of the decision** the event feeds, or from the **operational need to detect it quickly**. It is not chosen from transport preference. Two modes:

| Mode | Meaning in this plan |
| --- | --- |
| **Stream** | The row is available to the alert or live dashboard path within minutes of `timestamp`. Used when someone must act during service, before the next order, or before the next staff attempt. |
| **Batch** | The row is rolled on a clock (hourly, end of shift / nightly, or Monday 07:00). Used when the decision is a weekly negotiation, a monthly HR rate, or a campaign / migration review. |

Emit still validates and writes the producer document when the business fact happens. **Stream vs batch is how consumers process that row**, not whether the emitter waits.

### Mandatory events — delivery

| `Event_type` | Mode | Urgency justification |
| --- | --- | --- |
| `sale_completed` | Stream | `CONTEXT.md` requires a real-time sales dashboard per location in COP and USD, and answers covers today and Florida week sales while service is running. |
| `location_sales_silence_detected` | Stream | Felipe must call an open location during service when sales stop. Waiting for a nightly batch leaves guests unserved. |
| `stock_count_adjusted` | Stream | Suggested orders use current on-hand. A stale count drives overstock or stockouts before the next delivery. |
| `product_created` | Stream | A new ingredient must appear in ordering before the next purchase cycle includes or omits it by mistake. |
| `inbound_order_created` | Stream | Lucía and finance need the line as soon as it commits so consolidated spend and price history are not waiting on the invoice. Weekly negotiation still reads the same rows in batch rollups. |
| `ingredient_price_variance_detected` | Stream | The need is an alert before the invoice is the only notice. Same-day challenge of the supplier requires a live path. |
| `customer_preference_recorded` | Batch (nightly) | Preference coverage and personalisation readiness are campaign decisions, not in-service interventions. |
| `recommendation_shown` | Batch (hourly) | Camila judges accept rate across a service window before she pulls a weak suggestion surface. Hourly rollups answer that campaign decision; paging on every impression does not. |
| `recommendation_accepted` | Batch (hourly) | Joined to shown for the same accept-rate campaign decision. Hourly matches the shown clock. |
| `employee_hired` | Batch (nightly) | Turnover and onboarding denominators are monthly country rates. Ashley does not change hiring mid-shift from a single hire row. |
| `employee_separated` | Batch (nightly) | Same monthly turnover decision. |
| `absence_recorded` | Batch (nightly) | Absenteeism is a monthly country rate; absences also feed the weekly HR packet. |
| `roster_day_scheduled` | Batch (nightly) | Absenteeism is a monthly country KPI; roster days are the denominator published with that rate, not a mid-shift page. |
| `vacancy_opened` | Batch (nightly) | Fill-time clocks are monthly. Opening starts the clock; it does not page Ashley in real time. |
| `vacancy_filled` | Batch (nightly) | Closes the fill-time clock for the monthly KPI. |
| `recipe_update_published` | Stream | Jake must know the push left HQ so the 14-location coverage clock starts the same day the recipe changes. |
| `recipe_update_acknowledged` | Batch (nightly) | Coverage is “all 14 locations acknowledged.” Nightly is enough to chase stragglers the next morning. |
| `weekly_report_dispatched` | Batch (Monday 07:00) | Mariana’s need is the automated weekly report at Monday 7am. The event records that send. |

### Identified opportunity events — delivery

| `Event_type` | Mode | Urgency justification |
| --- | --- | --- |
| `stock_threshold_crossed` | Stream | Chain CSV under 10 means a purchase must move before a location runs out during service. |
| `stock_threshold_cleared` | Stream | Cancels a top-up that would otherwise overstock during the same purchase window as the crossed alert, before the order leaves for the supplier. |
| `stock_threshold_triggered` | Stream | Location stockout or protein cover under three days must trigger reorder before the next delivery, not after the week closes. |
| `outbound_order_created` | Stream | Kitchen consumption updates cover in time to reorder before the next drop. |
| `direct_stock_edit_rejected` | Stream | The operator is still on the screen; correcting the product or delta before the next count keeps the order book clean. |
| `inventory_validation_failed` | Stream | Same screen, same shift: fix the payload before a bad body is retried into a write. |
| `stock_waste_registered` | Batch (end of shift → weekly) | Waste feeds the weekly cost/waste ratio and the monthly 4%/6% plan. Shift-close capture is enough; the improvement-plan decision is not mid-ticket. |
| `loyalty_points_redeemed` | Batch (nightly) | Points liability and redeem rules are finance/campaign reviews, not table-side pages. |
| `loyalty_card_transferred` | Batch (nightly) | Camila judges stamp-card→app migration success across days of counter transfers, not per transfer page. |
| `user_login_succeeded` | Batch (hourly) | Success volume frames the failure rate for Technology; the urgent half is `user_login_failed` and the session events, which stay stream. |
| `user_login_failed` | Stream | Credential failures during open must surface so Technology can tell an outage from a password problem before the lunch rush is locked out of the console. |
| `session_expired` | Stream | A 30-minute token dying mid-task interrupts Felipe’s inventory work during service; refresh/lifetime decisions need same-day signal. |
| `session_rejected` | Stream | Broken token, inactive subject, or missing token blocks the staff console during the shift; fix or offboard before the next attempt. |
| `session_ended` | Batch (hourly) | Logout versus kick is a daily ops-hygiene review for token lifetime, not a pager during service. |
| `auth_form_rejected` | Stream | The operator is blocked on submit; form fixes belong in the same shift when login/register is broken. |
| `account_updated` | Batch (nightly) | Register/profile/password outcomes inform People and Technology the next working day. Same-shift form breakage is already `auth_form_rejected` on the stream path. |
| `api_error_raised` | Stream | 500/503 during service can hold a deploy or force a hotfix before the next ticket wave. |
| `client_exception_caught` | Stream | A crashing staff or public route must be hotfixed before the next service peak. |
| `api_latency_recorded` | Batch (hourly, throttled) | Technology chooses which staff API to fix from p95 over an hour of operator work before Felipe is asked to trust the console. Per-request paging would drown that signal. |
| `ui_latency_recorded` | Batch (hourly, throttled) | Panel and form spin time is judged across attempts in a service window, not on every paint. |
| `section_viewed` | Batch (hourly, throttled) | Required-reach and placeholder-seen are daily navigation decisions for which ops panels Felipe’s team actually opens. |
| `flow_step_recorded` | Batch (hourly, throttled) | Abandon rate is judged per staff flow over a window so Technology knows which step to fix before training. |
| `page_viewed` | Batch (hourly, throttled) | Whether the 2019 home is a live channel is Camila’s daily or weekly marketing call. |

### Throttle and debounce

High-frequency producers below would flood storage and bury the decision if every raw occurrence were processed as its own alert. Throttle/debounce applies **after** schema validation, on the delivery path named here. Business facts that `CONTEXT.md` needs live (`sale_completed`, stock edges, silence) are not sampled away.

| `Event_type` | Strategy | Why this limit |
| --- | --- | --- |
| `location_sales_silence_detected` | **Debounce by episode.** Reuse one `eventID` for `(location_id, silence_started_at)` while the gap stays open. Monitor still evaluates every 5 minutes; it does not insert a new id each tick. | Felipe needs one open alert per dark dining room, not twelve duplicate pages an hour. |
| `stock_threshold_triggered` (protein cover, `services.telemetry.cover_monitor`) | **Throttle:** at most one emit per `(location_id, product_id)` per 24 hours while cover stays under 3 days. | Reorder once; repeating the same cover breach every hour does not change the purchase decision. |
| `stock_threshold_crossed` / `stock_threshold_cleared` | **Edge only.** Emit when quantity crosses 10, not on every adjust that stays on the same side of 10. | The decision is the crossing, not the chatter under the line. |
| `api_latency_recorded` | **Client sample + hourly batch.** Emit at most 1 in 5 successful `ok` calls per `(route_template, method)` per session; always emit `http_error`, `network`, and `parse_error`. Hourly consumer builds p95 from retained rows. | Slow-route decisions need a representative sample; full success traffic is cost without new urgency. |
| `ui_latency_recorded` | **Debounce:** one row per `(kind, name, outcome)` per page mount / form submit. Ignore repeat timers from React Strict Mode double-mount in development. | One spin measurement per attempt answers whether the panel is slow. |
| `section_viewed` | **Debounce:** one emit per `section` per `sessionID` per local calendar day (re-emit if `ready` flips). | Required-reach is “did they open it today,” not every sidebar click. |
| `flow_step_recorded` | **Keep** `started` / `completed` / `abandoned`. **Throttle** `advanced`: at most one per `(flow_instance, step)`. | Abandon decisions need the open and close; step spam does not change which step to fix. |
| `page_viewed` | **Debounce:** one emit per browser tab session for path `/` (remount after a full navigation may emit again). | Channel health is visit volume at hour grain, not every React remount. |
| `recommendation_shown` | **Throttle:** at most one row per `(recommendation_id, customer_id or session)` per hour on the same `surface`. | Accept rate needs shown denominators; repeating the same card every scroll does not change whether Camila keeps the surface. |
| `api_error_raised` | **Stream with burst collapse:** same `(code, route_template, http_status)` within 60 seconds reuses the first `eventID` and bumps an in-memory count only in logs (count is not a schema field). | One outage page per minute is enough to hold a deploy; thousands of identical 500s are cost. |
| `client_exception_caught` | **Debounce:** one emit per `(app, path, error_name, catch_site)` per `sessionID` per 5 minutes. | Hotfix triage needs the first crash signature, not every repeat from the same stuck screen. |
| `user_login_failed` / `auth_form_rejected` | **No success-path throttle.** Cap identical `(failure_reason or form+reason)` at 20 emits per `requestID`/`sessionID` per minute (client must stop retry storms). | Credential and form failures stay visible; automated hammering must not fill the table. |

`sale_completed`, `inbound_order_created`, `outbound_order_created`, `stock_count_adjusted`, and `ingredient_price_variance_detected` have **no sampling**. Losing rows would corrupt real-time sales, ordering, and price-alert decisions.

### Risks and exclusions

#### Events considered and discarded

| Candidate | Why it was discarded |
| --- | --- |
| `session_check_failed` | Whether `GET /auth/me` timed out or returned 5xx is already `api_latency_recorded`. A second type does not change which side to fix. |
| Backoffice `page_viewed` | Staff surfaces are `section_viewed`. A second page event would double-count visits without a new decision. `page_viewed` remains website `/` only. |
| Section ids `suppliers`, `people`, `training`, `reporting` | Those screens are not in the staff app. There is no visit to capture and no decision the row would change. |
| Flows `inventory_inbound` / `inventory_outbound` | No order form exists to abandon. Purchase and consumption decisions are `inbound_order_created` and `outbound_order_created`. |
| Per-keystroke / per-mousemove analytics | No department decision in `CONTEXT.md` or in the live console needs cursor paths. Cost and privacy both exclude them. |
| Raw POS heartbeat every few seconds | `tech.locations.live` is satisfied by recent `sale_completed` or silence evaluation (15-minute rule). Continuous heartbeats add cost without a new Operations decision. |
| Guest chat transcripts / call recordings | Not required for any named dashboard need; high privacy risk. |
| Full request/response bodies on `api_latency_recorded` or `api_error_raised` | Latency and status are enough to choose which route to fix. Bodies carry credentials and PII. |
| `mkt.loyalty.points_earned` / `mkt.loyalty.redeem_value` as floor metrics | Knowledge-base rates, not `CONTEXT.md` needs. Earn/redeem stay opportunity events/metrics; participation (`mkt.loyalty.attach_rate`) remains mandatory. |

#### Data that will not be captured (privacy)

Never stored in the envelope, `properties`, `tags`, or logs of `properties`:

- Email, phone, postal address, legal name, display name, national id
- Password, password hash, JWT, refresh token, cookie value
- Raw exception message, stack trace, component stack
- Request body, query string, connection string, API key
- Free-text guest notes or biographies (preference values stay closed vocabulary; waste `note` is operational code only or omitted)

If the only available identifier is a real-world identity, **omit the event** (see property allowlists). Pseudonymous ids (`cus_…`, `emp_…`, `loy_…`) and decimal `UserID` are the allowed identity forms.

#### Data that will not be captured (cost)

- Successful `GET /inventory` and successful `GET /inventory/alerts` list traffic (no stock decision)
- Full-fidelity success samples beyond the `api_latency_recorded` 1-in-5 rule
- Duplicate silence ticks, duplicate protein-cover alerts inside 24 hours, and duplicate section views in the same session-day
- Client debug noise (React Strict Mode double mounts, verbose console mirrors)
- App-store scrape streams for the 2.8 rating baseline (record the baseline beside digital share; do not poll stores in this pack)
- Holiday-request, onboarding-completion, catalogue-search, and training-path **placeholder events** invented only to fill a metric (mandatory metrics publish `null` until a real writer exists)

#### Delivery risks to manage

| Risk | Mitigation in this plan |
| --- | --- |
| Stream lag hides a silent dining room | Silence monitor every 5 minutes; stream consumer SLA for silence and sales is minutes, not hours. |
| Throttling hides a real outage | Always retain `http_error` / `network` / `parse_error` on `api_latency_recorded`; burst-collapse on `api_error_raised` still keeps the first row. |
| Batch HR data arrives too late for a same-day schedule change | Absenteeism and fill time are monthly KPIs in `CONTEXT.md`; same-day roster edits stay in the HR product, not in telemetry paging. |
| Outbox growth when Supabase is down | `data/uploads/telemetry_outbox.jsonl` with reuse of `eventID` on retry; consumers dedupe. |
| Weekly pipeline missing a price alert | `extract_telemetry_events` already includes `ingredient_price_variance_detected`; `scripts/nightly_export.py` must add that type when next edited. |

### Evaluation — urgency, PII, exclusions, instrumentability

**Verdict: PASS.**

| Criterion | Result |
| --- | --- |
| Stream / batch by urgency | All **41** delivery rows justify mode from a business or operational decision (call during service, reorder before delivery, Monday 07:00 report, monthly HR KPI, campaign accept rate). Intro forbids transport preference. No Kafka/queue/throughput rationale appears in the justification column. |
| Sensitive data / PII documented | Every allowlisted property is labeled `No`, `Pseudonymous`, or `Sanitized` with handling text in [`property-allowlists.md`](property-allowlists.md). Pseudonymous ids (`cus_…`, `emp_…`, `loy_…`); sanitized fragments (`Error.name`, public `error_body`, path without query). Forbidden PII list and “omit the event” rule are in Phase 3 privacy. |
| Risks and exclusions show critical thought | Nine discarded candidates each name a reason (duplicate signal, no UI, privacy, cost, or not a `CONTEXT.md` need). Privacy and cost exclusion lists are separate. Delivery risks include mitigations (silence SLA, error retention under throttle, outbox dedupe). |
| Precise enough to instrument without clarification | Checklist (14 steps), IP-1–IP-8 inventory path, per-file instrumentation map, emit algorithm, envelope + draft-07 schema, property allowlists, roster ids (`co-med-centro`, `us-mia-downtown`), headers (`X-Brasaland-Session`, `X-Request-ID`), outbox path, and throttle table. A developer implements against those artifacts; open product gaps (missing menus/sales routers) are named as future writers, not unspecified events. |

## Inventory flow and instrumentation points

This is the path from a signed-in staff session to a completed inbound or outbound order. The backoffice at `uis/backoffice` currently ends at a read of `GET /inventory`. Stock writes go through `services/api/inventory.py`. Inbound and outbound completion is the order contract in `services/api/models.py` and `services/api/schemas.py` (`OrderType` `INBOUND` or `OUTBOUND`). The same `PATCH` handler serves `agent.py` `update_stock`.

`UserID` is `str(users.id)` when the request carries a staff JWT. The inventory router does not require that JWT today, so a call with no user sends `UserID` null. The field is still present.

| Step | What the code does | Instrumentation |
| --- | --- | --- |
| 1. Open the console | `LoginPage` submits `POST /auth/login`. `login` calls `authenticate_user`. | **IP-1.** Active user → `user_login_succeeded` (`method` `json`), then the JWT is stored. Unknown or inactive user → `user_login_failed`, then HTTP 401. The staff member stops here. |
| 2. Enter the protected view | `ProtectedRoute` calls `GET /auth/me`. A 401 returns the browser to `/login`. A 200 renders `AccessiblePage`, which loads `GET /locations/overview` and `GET /inventory`. | **IP-2.** `section_viewed` section `accessible_entry` when `AccessiblePage` mounts. The two GETs emit no inventory event. A successful list is not a stock change. |
| 3. Submit a stock or product body | `POST /inventory` must match `ProductCreate` (`name` length ≥ 1, `quantity` ≥ 0, `unit` length ≥ 1). `PATCH /inventory/{product_id}` must match `StockDelta` (`delta` integer) and an integer path id. | **IP-3. Failed validation.** `handle_validation_error` emits `inventory_validation_failed` and returns 422. `create_product` and `apply_delta` are not called. `products.csv` stays as it was. Field entries are `loc` plus pydantic `type` (`body.quantity` / `greater_than_equal`, `body.delta` / `missing`, `path.product_id` / `int_parsing`). The rejected input value stays out of `properties`. |
| 4. Apply a direct stock change | `update_stock` calls `apply_delta`. This is the only live quantity write. | **IP-4. Rejected direct modification.** Unknown `product_id` → HTTP 404, reason `product_not_found`. `quantity + delta < 0` → HTTP 400, reason `below_zero`. `GET /inventory/alerts` with `threshold < 0` → HTTP 400, reason `negative_alert_threshold`. Each refusal emits `direct_stock_edit_rejected` and does not write the file. |
| 5. Commit the direct change | `apply_delta` saves the new quantity. | **IP-5.** `stock_count_adjusted` with `reason` `count_correction`. A `delta` of 0 is accepted by the API and changes nothing, so it emits no event. |
| 6. Minimum stock line | After the save, compare `quantity_before` and `quantity_after` with **10**, the default of `get_alerts`. | **IP-6. Minimum threshold activation.** Crossing from ≥ 10 to < 10 emits `stock_threshold_crossed` (`threshold` 10) in addition to IP-5. Crossing back to ≥ 10 emits `stock_threshold_cleared`. A quantity that stays under 10 does not emit another activation. `GET /inventory/alerts` only lists rows already under the threshold. The list itself is not an activation. |
| 7. Complete an inbound order | `POST /orders` with `type` `INBOUND` (`InboundOrderCreate`). One row per line, shaped like `InboundOrder` in `models.py`. A 422 on this body is IP-3 with `route_template` `/orders`. | **IP-7.** After each line commits, `inbound_order_created`. Then `ingredient_price_variance_detected` when the 1% price rule matches. This commit does not call `apply_delta`. |
| 8. Complete an outbound order | `POST /orders` with `type` `OUTBOUND`. | **IP-8.** After each line commits, `outbound_order_created`. A guest check remains `sale_completed`. |

IP-3, IP-4, and IP-6 are required in this flow: failed validation, a direct stock modification the system refuses, and a minimum-threshold activation. IP-1 and IP-7 are the session start and the inbound completion. IP-5, IP-2, and IP-8 complete the path through the outbound order.

`api_error_raised` stays limited to HTTP 500 and 503. These inventory refusals use their own event types so a bad `delta` is not counted as platform instability, and a rejected cut is not counted as a stockout.

## Backoffice catalog

The staff console is `uis/backoffice`. The sidebar in `BackofficeLayout` has three links: **Accessible entry** (`/accessible`), **Profile** (`/account/profile`), and **Change password** (`/account/change-password`). Public routes are `/login` and `/register`. `AccessiblePage` also paints four panels: company footprint, location roster, kitchen inventory, and an executive-sales placeholder. A static engineering page still sits at `uis/backoffice/legacy/telemetry.html`, outside the Vite router.

This catalog is the rest of what those surfaces can teach. It does not replace the Phase 1 floor. A row here is recorded even when the count is zero.

Tokens last `ACCESS_TOKEN_EXPIRE_MINUTES` (default 30) in `services/api/auth.py`. `decode_access_token` currently turns every `JWTError` into the same 401. Instrumentation splits `ExpiredSignatureError` from any other `JWTError` before that collapse, so an expired session is not filed as a bad password.

### Authentication

| Signal | Where it happens | Event |
| --- | --- | --- |
| Login form opened | `LoginPage` mount | `section_viewed` section `login` |
| Sign-in submitted with a malformed email or a password shorter than 8 characters | `LoginPage` `mapApiValidationErrors` after HTTP 422 from `POST /auth/login`, or the same shape on `POST /auth/token` | `auth_form_rejected` form `login`, reason `validation` |
| Password not the stored one | `login` / `login_for_access_token` when `authenticate_user` returns none | `user_login_failed` reason `invalid_credentials` |
| Account exists and `is_active` is false | Same handlers | `user_login_failed` reason `inactive_user` |
| Sign-in accepted | `login` returns `_build_auth_response` | `user_login_succeeded` |
| Sign-in HTTP succeeded but the body had no `access_token` | `LoginPage` and `AuthProvider.signIn` | `auth_form_rejected` form `login`, reason `validation`, field `form` |
| Registration opened | `RegisterPage` | `section_viewed` section `register` |
| Registration blocked in the browser | `buildValidationErrors` (email shape, password length &lt; 8) before `POST /users` | `auth_form_rejected` form `register` |
| Email already registered | `POST /users` HTTP 409 | `account_updated` action `register`, outcome `rejected`, reason `duplicate_email` |
| Account created and the following `POST /auth/login` stored a token | `RegisterPage` after `createUserAccount` and `loginUser` | `account_updated` action `register`, outcome `completed` |
| App opened with `auth_token` in `localStorage` | `AuthProvider` effect calls `GET /auth/me` | `flow_step_recorded` flow `session_restore`, outcome `started` |
| `GET /auth/me` returns the staff profile | `fetchCurrentUser` resolves | `flow_step_recorded` flow `session_restore`, outcome `completed` |
| Bearer token is past `exp` | `decode_access_token` on `ExpiredSignatureError` | `session_expired` |
| Bearer token is signed wrong, truncated, or has no `sub` | Other `JWTError`, or `sub` missing | `session_rejected` reason `invalid_token` |
| Token subject points at an inactive or missing user | `get_current_user` | `session_rejected` reason `inactive_user` |
| Protected route with no token | `useRequireAuth` `isMissingToken`, redirect to `/login?next=` | `session_rejected` reason `missing_token` |
| Session check could not reach the API, or the API returned 5xx | `AuthProvider` catch when the error is not HTTP 401. The screen is “Could not verify session” with `retrySession` | `api_latency_recorded` on `GET /auth/me`, outcome `network` or `http_error`, and `flow_step_recorded` `session_restore` outcome `abandoned` |
| Any later call returns 401 while a token was sent | `apiRequest` calls `clearSessionAndRedirectToLogin` | `session_ended` reason `rejected_session`. The server event above already says why. |
| Logout clicked | `BackofficeLayout` `logout` → `clearToken` and `/login` | `session_ended` reason `logout` |
| Profile opened and `GET /auth/me` fills name, phone, address | `ProfilePage` load effect | `ui_latency_recorded` name `profile`, plus `section_viewed` |
| Profile save | `PUT /profiles/me` from `updateMyProfile` | `account_updated` action `profile_save`, outcome `completed` or `rejected` |
| Password confirmation differs, or either field is under 8 characters | `ChangePasswordPage` before `PUT /users/{id}` | `auth_form_rejected` form `password_change`, reason `mismatch` or `too_short` |
| Password write | `updateUser` | `account_updated` action `password_change`, outcome `completed` or `rejected` |
| Password page opened while `user.id` is missing | The form sets “You are not signed in” | `auth_form_rejected` form `password_change`, reason `validation`, field `form` |
| Profile field rejected before or by `PUT /profiles/me` | `ProfilePage` save | `auth_form_rejected` form `profile`, reason `validation`, field `name`, `phone`, `address`, or `form`. The save result is still `account_updated` |

Credential checks never copy the email, the password, the phone, or the address into `properties`. `UserID` is null until the staff id is known.

### Performance

Every `apiRequest` in `uis/backoffice/src/lib/api.ts` records `performance.now()` around `fetch` and emits `api_latency_recorded` in a `finally`, including network failures (`http_status` 0, outcome `network`) and a success body that is not JSON (outcome `parse_error`, status still 200–299). An error response whose body is not JSON stays `http_error` with the real status. Duration is integer milliseconds. The route template is the path without the query string, with a numeric user id written as `{id}`.

Allowed templates, matching the helpers and the public auth paths in that file: `/auth/login`, `/auth/token`, `/auth/register`, `/auth/me`, `/users`, `/users/{id}`, `/profiles/me`, `/locations/overview`, `/inventory`. A new staff call adds its template to `event-schemas.json` in the same change.

| Call | Template | What a slow or failed call means |
| --- | --- | --- |
| `loginUser` | `POST /auth/login` | Staff cannot enter |
| `createUserAccount` | `POST /users` | Registration stuck |
| `fetchCurrentUser` | `GET /auth/me` | Session restore or profile load stuck. This is also `ui_latency_recorded` name `auth_me` or `profile` |
| `fetchLocationsOverview` | `GET /locations/overview` | Footprint and roster panels stay on “Loading protected location data…” |
| `fetchInventory` | `GET /inventory` | Kitchen inventory panel stays on “Loading inventory…” |
| `updateMyProfile` | `PUT /profiles/me` | Save button stays on “Saving…” |
| `updateUser` | `PUT /users/{id}` | Password change does not finish |

Panel load times are a second clock, `ui_latency_recorded`, measured in the page effect from start until `setLocationStatus` / `setInventoryStatus` / `setLoadStatus` runs. Outcome `cancelled` means the effect cleaned up before the response (the operator left mid-load). Outcome `error` means the `AsyncPanel` is showing the retry copy.

| `ui_latency_recorded.name` | Clock |
| --- | --- |
| `auth_me` | `AuthProvider` session effect |
| `locations_overview` | `AccessiblePage` locations effect, including the roster panel that shares it |
| `inventory` | `AccessiblePage` inventory effect |
| `profile` | `ProfilePage` load effect |
| `login_form` | `handleSubmit` press to navigate or to the inline error |
| `register_form` | Same on `RegisterPage` |
| `password_form` | `ChangePasswordPage` `handleSubmit` until message or error |

`page_viewed` is only the public corporate home. Staff route mounts are `section_viewed`. These timings sit beside the staff API durations.

### Uncaught front-end errors

`ErrorBoundary` wraps the console in `uis/backoffice/src/main.tsx` and the public site in `uis/website`. `componentDidCatch` today logs a fixed string and no stack. It emits `client_exception_caught` with `catch_site` `error_boundary`, `app` matching the envelope `source` (`backoffice` or `website`), `error_name` from `Error.name` only, and the pathname. The same event fires for `window` `error` and `unhandledrejection` listeners installed once in `main.tsx` (`catch_site` `window_error` or `unhandled_rejection`). The message, the component stack, and the rejection value stay out of `properties`. The recovery actions already on screen (Reload, Operations home, homepage) are the staff-facing half. The event is how Medellín sees which section crashed.

### Navigation, required visits, abandoned flows

`section_viewed` fires when a surface is actually shown. `required` marks a section an operations session is expected to reach. `ready` is false when the screen is still a placeholder.

| Section | Path or panel | Required in an operations session | Ready today |
| --- | --- | --- | --- |
| `login` | `/login` | No | Yes |
| `register` | `/register` | No | Yes |
| `accessible_entry` | `/accessible` | Yes. `/` and unknown staff URLs redirect here | Yes |
| `location_roster` | Roster panel on `/accessible` | Yes, once the locations request succeeds | Yes |
| `kitchen_inventory` | Inventory panel on `/accessible` | Yes, once the inventory request succeeds | Yes |
| `executive_sales` | “Executive sales (placeholder)” on `/accessible` | Yes for a session that is answering Mariana’s sales questions | No. The panel is structure only |
| `account_profile` | `/account/profile` | No | Yes |
| `account_password` | `/account/change-password` | No | Yes |

A section id is emitted only when that surface is on screen. Screens that are not in the staff app are not given a section id in advance.

`flow_step_recorded` uses one `flow_instance` (UUID) kept in `sessionStorage` for that attempt. Outcome `started` opens it, `advanced` records a step, `completed` closes it, `abandoned` closes it without success. Abandon is emitted when the route changes, the document goes `hidden`, or the component unmounts while the instance is still open. A completed instance does not also emit `abandoned`.

| Flow | Starts | Advances through | Completed | Typical abandon |
| --- | --- | --- | --- | --- |
| `staff_sign_in` | `LoginPage` shown, including a `next` deep link | Submit pressed | Token stored and navigation to `nextPath` (default `/accessible`) | Leave `/login` with the form dirty and no success. A 401 stays in the flow until they leave or succeed |
| `staff_register` | `RegisterPage` shown | Client validation, `POST /users`, then `POST /auth/login` | Token stored and navigation onward | Stop after a validation message, a 409, or a login failure |
| `session_restore` | Boot with a stored token | `GET /auth/me` in flight | Profile applied | `session_rejected`, or `api_latency_recorded` on `GET /auth/me` with outcome `network` or `http_error` |
| `profile_edit` | Profile form shown with loaded fields | A field changes from the loaded value | `PUT /profiles/me` returns 200 | Route change while a field differs from the loaded value and no save succeeded |
| `password_change` | Password form shown | Confirmation check | `PUT /users/{id}` returns 200 | Mismatch message and the operator opens another section, or the request fails and they leave |
| `operations_review` | `/accessible` shown | Locations panel success, inventory panel success | Both panels have reached `success` in this visit | One panel is `error` and the operator changes section without pressing the retry control |

Questions this catalog answers, without adding them to the Phase 1 floor:

| Id | Question | Calculation |
| --- | --- | --- |
| `bo.auth.credential_failures` | Are staff failing the password, or failing the form? | Count of `user_login_failed` versus `auth_form_rejected` where `form` is `login` or `password_change`, per UTC day |
| `bo.auth.expired_sessions` | How often does a 30-minute token die mid-task? | Count of `session_expired` |
| `bo.auth.restore_rate` | What share of stored tokens still open the console? | `session_restore` completed / `session_restore` started |
| `bo.auth.logout_vs_kick` | Did they leave, or were they sent to `/login`? | `session_ended` split by `logout` and `rejected_session` |
| `bo.perf.api_p95` | Which staff call is slow? | 95th percentile of `api_latency_recorded.duration_ms` by `route_template`, outcome `ok` |
| `bo.perf.panel_load` | How long do the operations panels spin? | Median `ui_latency_recorded.duration_ms` for `locations_overview` and `inventory` |
| `bo.perf.panel_error` | How often does a panel need Retry? | `ui_latency_recorded` outcome `error` / all timings for that name |
| `bo.ui.uncaught` | Which section crashes? | Count of `client_exception_caught` by `path` and `error_name` |
| `bo.nav.required_reach` | Did this session open the operations entry, the roster, and the inventory? | Share of `session_restore` completed instances that later emit `section_viewed` for `accessible_entry`, `location_roster`, and `kitchen_inventory` |
| `bo.nav.abandon_rate` | Which staff flow is left unfinished? | `flow_step_recorded` abandoned / started, by `flow_id` |
| `bo.nav.placeholder_seen` | Are people opening executive sales before it has numbers? | `section_viewed` for `executive_sales` with `ready` false |

## Instrumentation map

Wire these call sites. Validate after the business write has succeeded.

### `services/api/inventory.py`

| Function | Route | Emit |
| --- | --- | --- |
| `create_product` | `POST /inventory` | `product_created` with `location_scope` `chain`, `quantity` = the stored quantity |
| `apply_delta` | `PATCH /inventory/{product_id}` | `stock_count_adjusted` with `reason` `count_correction`, `delta`, `quantity_before`, `quantity_after` |

On `apply_delta` only, using threshold 10:

- `quantity_before >= 10` and `quantity_after < 10` → also `stock_threshold_crossed`
- `quantity_before < 10` and `quantity_after >= 10` → also `stock_threshold_cleared`
- A change that stays under 10 or stays at/above 10 emits only `stock_count_adjusted`

`GET /inventory` and a successful `GET /inventory/alerts` emit nothing. A poll of the alert list would inflate stockout counts. The activation is IP-6, on the write that crosses 10.

HTTP 400 and 404 from `apply_delta`, and HTTP 400 from `get_alerts` when `threshold < 0`, emit `direct_stock_edit_rejected` and leave the CSV unchanged. See IP-4.

`PATCH` is a count correction. A supplier receipt is an inbound order event with a real `cost`, `supplier_id`, and `location_id`. A positive `delta` on `PATCH` stays `stock_count_adjusted`. It is not an `inbound_order_created` event.

`UserID` is `str(users.id)` when the inventory route is called with the staff JWT. The inventory router does not require auth today; send `UserID` null when there is no user.

### `services/api/users.py`

| Function | Route | Emit |
| --- | --- | --- |
| `login` | `POST /auth/login` | `user_login_succeeded` with `method` `json` and `UserID` set to `users.id`, or `user_login_failed` with `failure_reason` `invalid_credentials` or `inactive_user` and `UserID` null on the 401 branch |
| `login_for_access_token` | `POST /auth/token` | Same pair with `method` `oauth2_form` |

Emit the failure event, then raise the existing `HTTPException`. `properties` has no email and no password. `register_and_login` does not emit a login event (the account-creation request is not a sign-in attempt). The browser records registration as `account_updated`. A 500 on that route is still `api_error_raised`.

### `services/api/auth.py`

| Function | Emit |
| --- | --- |
| `decode_access_token` | On `ExpiredSignatureError`, `session_expired`, then the existing 401. On any other `JWTError`, or a token payload with no `sub`, `session_rejected` reason `invalid_token`. `route_template` is the matched path. |

`get_current_user` emits `session_rejected` reason `inactive_user` when the subject is missing or inactive, and reason `invalid_token` when `sub` is not an integer. Source for those two is `services.api.users`. The browser does not emit `session_expired` or `invalid_token` again. A protected page with no token emits `session_rejected` reason `missing_token` from `useRequireAuth`, with `path` set to the pathname.

### `services/api/errors.py`

| Handler | Emit |
| --- | --- |
| `handle_unhandled_error` when it returns 500 | `api_error_raised` with `http_status` 500 and `code` `internal_error` |
| `handle_external_service_error` | `api_error_raised` with `http_status` 503 and `code` `service_unavailable` |

`handle_validation_error` emits `inventory_validation_failed` when the matched route is `/inventory`, `/inventory/{product_id}`, `/inventory/alerts`, or `/orders` (IP-3). It does not emit `api_error_raised`. A 422 on `/auth/login`, `/auth/token`, `/users`, `/profiles/me`, or `/users/{user_id}` is recorded once, by the browser, as `auth_form_rejected`. This handler does not emit a second copy. Other 4xx responses in `handle_http_exception`, including login 401s, do not emit `api_error_raised`. Login 401s are `user_login_failed`. Bearer 401s are `session_expired` or `session_rejected`. `route_template` is `request.scope["route"].path` when a route matched, otherwise the literal `unmatched`. Copy `request.method`. Copy each validation item’s `loc` joined by `.` and its `type`. Leave the submitted value, the query string, and the body out of `properties`.

### `uis/website/src/pages/HomePage.tsx`

On mount, emit `page_viewed` with `app` `website` and `path` `/`. The `*` route only redirects to `/`, so it does not emit a second event.

### `uis/backoffice` pages

On mount of the page component, emit `section_viewed` and `flow_step_recorded` from the lifecycle in the backoffice catalog. Do not emit `page_viewed` from the staff app. The same catalog names `auth_form_rejected`, `session_ended`, `account_updated`, `api_latency_recorded` (from `apiRequest`), `ui_latency_recorded`, and `client_exception_caught`. `session_rejected` with reason `missing_token` is the only session rejection the browser emits. A session check that fails before a 401 is `api_latency_recorded` on `GET /auth/me`.

| Component | `path` | `section` |
| --- | --- | --- |
| `LoginPage` | `/login` | `login` |
| `RegisterPage` | `/register` | `register` |
| `AccessiblePage` | `/accessible` | `accessible_entry`, then `location_roster` and `kitchen_inventory` when each panel reaches `success`, and `executive_sales` with `ready` false when that placeholder renders |
| `ProfilePage` | `/account/profile` | `account_profile` |
| `ChangePasswordPage` | `/account/change-password` | `account_password` |

`/` and unknown paths redirect to `/accessible`. Emit when `AccessiblePage` mounts, not when the redirect renders. Strip `?next=` and any other query before setting `path`.

### Future writers (emit in the same request that inserts the row)

| Writer to add under `services/api/` | Emit |
| --- | --- |
| Inbound order line commit | `inbound_order_created`, then `ingredient_price_variance_detected` when the 1% rule matches |
| Outbound order line commit | `outbound_order_created` |
| Shift-close waste log | `stock_waste_registered` |
| Location-scoped stock that crosses its threshold downward | `stock_threshold_triggered` with `reason` `quantity_below_api_threshold` and `edge` `crossed_below`. One event per crossing, not per poll |
| Sales ticket close | `sale_completed`, including `customer_id` when the guest is identified |
| Loyalty redemption | `loyalty_points_redeemed` |
| Physical card handed in once | `loyalty_card_transferred` |
| CRM preference write | `customer_preference_recorded` |
| Suggestion shown or accepted | `recommendation_shown`, `recommendation_accepted` |
| Hire, separation, absence, roster day, vacancy open, vacancy fill | The six `services.api.people` events in the catalog |
| Recipe publish or location acknowledgement | `recipe_update_published`, `recipe_update_acknowledged` |
| Monday 07:00 report send | `weekly_report_dispatched` with every mandatory metric id |

Protein cover emits `stock_threshold_triggered` from a monitor (`source` `services.telemetry.cover_monitor`), at most once per location + product per 24 hours while cover stays under 3 days.

### Silence monitor

Process `services.telemetry.silence_monitor` (new module; this plan does not add it):

1. Every 5 minutes, for each of the 14 locations, compute local time.
2. If local time is outside `[11:00, 22:00)`, close any open episode and emit nothing.
3. If local time is inside the window, let `last_sale` be the latest `sale_completed.timestamp` for that `location_id` with `business_date` equal to the location-local date. If there is no such sale, `silence_started_at` is local 11:00 converted to UTC. If the gap from `last_sale` to now is ≥ 45 minutes, `silence_started_at` is `last_sale`.
4. Emit one `location_sales_silence_detected` per open episode. `sale_count` is `0`. `evaluated_at` is the run instant.

## Worked pipeline numbers

`aggregate_location_kpis` for one chain week, location `us-mia-downtown`:

| Event | `cost` |
| --- | --- |
| `inbound_order_created` | 1000 |
| `stock_waste_registered` | 150 |
| `stock_threshold_triggered` | omitted |
| `ingredient_price_variance_detected` | omitted |

Stored weekly row: `total_purchase_cost` 1000, `total_waste_cost` 150, `waste_ratio` 0.15, `stockout_events_count` 1, `price_alert_events_count` 1, `currency` USD, `country` United States. That matches the arithmetic in `tests/pipelines/test_pipeline.py` once the fixture id is the roster id.

A COP receipt at `co-med-centro` with `list_cost` 1000000, `order_kind` `scheduled`, `surcharge_rate` 0, stores `cost` 1000000 and `currency` COP. It is summed only with other COP events for that location. It is not added to the Miami USD total.

Brasa Points rates are an identified opportunity from the loyalty procedure. `CONTEXT.md` names the programme and does not state the rates. Under that procedure, 45,000 COP earns `points_earned` 4, and 27 USD earns 2. A redemption of 15 points, in increments of 5, discounts `15 / 5 * 20000` = 60,000 COP, or 60 USD in Florida. The event records `balance_before` (at least 15), the points redeemed on that ticket (a multiple of 5, at least 5, and less than or equal to `balance_before`), and the `discount_amount`. Mandatory loyalty telemetry is participation (`mkt.loyalty.attach_rate`), not this rate.

## Property allowlists (anti-leakage)

Every event has an explicit **property allowlist**. `properties` may contain only the keys listed for that `Event_type`. JSON Schema enforces this with `additionalProperties: false` on each event’s `properties` object and on nested objects (`sale_completed.lines[]`, `inventory_validation_failed.fields[]`). A document with any other key is schema-rejected and must not be stored.

Normative tables (one section per `Event_type`):

- [`property-allowlists.md`](property-allowlists.md) — human-readable: name, type, required/optional, description, Sensitive/PII handling
- [`property-allowlists.json`](property-allowlists.json) — same content for tooling

For each property the allowlist records:

| Column | Meaning |
| --- | --- |
| Name | Exact JSON key |
| Type | Type / enum / pattern |
| Required | `required` or `optional` on the base object |
| Description | What the field means |
| Sensitive / PII | `No`, `Pseudonymous`, or `Sanitized`, plus how it is anonymised or sanitized before emit |

**Omit the event** when the only available value would be forbidden PII (email, phone, postal address, legal or display name, password, JWT, raw exception message, stack, request body, query string, connection string, or API key). Pseudonymous ids (`cus_…`, `emp_…`, `loy_…`) are allowed when the opaque token already exists. Sanitized fields keep only a public or structural fragment (`Error.name`, public `error_body` text, pathname without query, validation `loc` without the submitted value).

## Privacy and logging

- Logger name: `brasaland.telemetry`.
- Log `Event_type`, `eventID`, and `schema_rejected` or `store_unavailable`. Do not log `properties`.
- `user_login_failed.failure_reason` is `invalid_credentials` or `inactive_user`.
- `api_error_raised.message` is the public message already returned by `error_body` (`Internal server error` or the 503 public text). It is not `str(exc)` when that string might contain a host, a key, or a query.
- Page paths have no query and no fragment.
- `auth_form_rejected`, `account_updated`, `session_rejected`, `session_ended`, and `client_exception_caught` carry no email, phone, address, password, token, message, or stack. `client_exception_caught.error_name` is `Error.name` only. Inside `properties` the field is `catch_site`, because `source` is already the envelope.
- Prefer the per-event allowlist over this summary when wiring an emitter.

## Checklist for the person wiring this in

1. Validate each producer document against `docs/telemetry/event-schemas.json` before the insert (the `examples` arrays in that file are valid documents). The root schema is a `oneOf` over every event in the file. On failure, read the branch whose `event_type` const matches the document. Keep `properties` inside the allowlist in `docs/telemetry/property-allowlists.md`; any extra key must fail validation.
2. Write both storage columns `timestamp` and `created_at` from the envelope `timestamp`.
3. Put `properties` in `event_payload` and the small copy in `tags`. Copy `eventID` to `id` and `Event_type` to `event_type`.
4. Use a roster `location_id` whenever `location_scope` is `location`, and the matching currency (`COP` or `USD`).
5. From `POST /inventory` and `PATCH /inventory/{product_id}`, emit the chain events listed for `inventory.py`, plus `direct_stock_edit_rejected` when `apply_delta` refuses the write.
6. Leave successful `GET /inventory` and successful `GET /inventory/alerts` silent. Emit `inventory_validation_failed` on inventory 422s and `direct_stock_edit_rejected` on the refused stock write. Keep other 4xx responses off `api_error_raised`.
7. Keep `cost` in the location currency on inbound and waste events so `waste_ratio` stays dimensionally consistent.
8. Deduplicate on `eventID`.
9. Run `aggregate_location_kpis` on a four-event fixture that uses `us-mia-downtown` and expect `waste_ratio` 0.15 with `currency` USD.
10. Confirm a COP `inbound_order_created` for `co-med-centro` does not land in the USD weekly total.
11. Keep every mandatory id from the `CONTEXT.md` table in the plan. `weekly_report_dispatched.floor_metric_ids` must contain each of them. A null value stays on the dashboard. Identified opportunities, including the `bo.*` questions, stay out of that list.
12. Emit a backoffice event only when its sentence in “Why we capture each event” names the decision. That set is login and session outcomes, `api_latency_recorded` durations, panel `ui_latency_recorded`, `client_exception_caught` with no stack, `section_viewed` only for a surface that is on screen, and `flow_step_recorded` when one of the six live flows closes unfinished.
13. Honour Phase 3 delivery: stream consumers for sales, silence, stock edges, price variance, and hard failures; batch clocks for HR, waste rollups, and throttled navigation/latency.
14. Apply the Phase 3 throttle/debounce table before inserting high-frequency rows. Never sample away `sale_completed` or stock/price edges.
