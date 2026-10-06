# Brasaland telemetry — property allowlists

Normative companion to [`telemetry-plan.md`](telemetry-plan.md) and [`event-schemas.json`](event-schemas.json).

## Rule

For every event, `properties` may contain **only** the keys listed for that `Event_type`.
JSON Schema sets `additionalProperties: false` on each event’s `properties` object (and on nested objects such as sale `lines[]` and validation `fields[]`). A document with any other key is rejected and must not be stored.
Envelope keys (`eventID`, `timestamp`, `sessionID`, `UserID`, `Event_type`, `SchemaVersion`, `requestID`, `source`, `tags`) are outside this allowlist; see `definitions.envelope`.

## Forbidden keys (every event)

These must never appear in `properties` or the envelope. If emitting would require one of them, **omit the event**:

- email, phone, postal address, legal name, display name
- password, password hash, JWT, refresh token, session cookie value
- raw exception message, stack trace, component stack, request body, query string, connection string, API key

## Columns

| Column | Meaning |
| --- | --- |
| Name | Exact JSON key |
| Type | JSON Schema type / enum / pattern summary |
| Required | On the base properties object (`if`/`then` may add conditional requirements) |
| Description | Field meaning |
| Sensitive / PII | `No`, `Pseudonymous`, or `Sanitized`, and how it is handled before emit (or when the event is omitted) |

## `product_created`

**Description:** POST /inventory after create_product writes products.csv. Map CSV name to product_name.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `location_scope` | enum: "chain", "location" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `product_id` | integer (minimum 1) | required | Inventory product primary key. | **No.** Integer inventory id. |
| `product_name` | string (minLength 1) | required | Catalogue name of the ingredient or SKU. | **No.** Ingredient / SKU catalogue label. Not a person name. |
| `quantity` | integer (minimum 0) | required | Quantity in `unit`. | **No.** Business / operational field. Not personal data under this plan. |
| `unit` | string (minLength 1) | required | Unit of measure. | **No.** Business / operational field. Not personal data under this plan. |
| `country` | enum: "Colombia", "United States" | optional | Colombia or United States, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `currency` | enum: "COP", "USD" | optional | COP or USD, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `location_id` | string (roster location_id) | optional | Roster id for one of the 14 restaurants. | **No.** Business / operational field. Not personal data under this plan. |
| `timezone` | enum: "America/Bogota", "America/New_York" | optional | America/Bogota or America/New_York, matching the location. | **No.** Business / operational field. Not personal data under this plan. |

## `stock_count_adjusted`

**Description:** PATCH /inventory/{product_id} after apply_delta commits. reason is count_correction.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `delta` | integer | required | Signed integer change applied (never 0 on a successful adjust). | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | enum: "chain", "location" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `product_id` | integer (minimum 1) | required | Inventory product primary key. | **No.** Integer inventory id. |
| `product_name` | string (minLength 1) | required | Catalogue name of the ingredient or SKU. | **No.** Ingredient / SKU catalogue label. Not a person name. |
| `quantity_after` | integer (minimum 0) | required | On-hand quantity after the change. | **No.** Business / operational field. Not personal data under this plan. |
| `quantity_before` | integer (minimum 0) | required | On-hand quantity before the change. | **No.** Business / operational field. Not personal data under this plan. |
| `reason` | const "count_correction" | required | Closed-enum reason for this event. | **No.** Business / operational field. Not personal data under this plan. |
| `unit` | string (minLength 1) | required | Unit of measure. | **No.** Business / operational field. Not personal data under this plan. |
| `country` | enum: "Colombia", "United States" | optional | Colombia or United States, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `currency` | enum: "COP", "USD" | optional | COP or USD, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `location_id` | string (roster location_id) | optional | Roster id for one of the 14 restaurants. | **No.** Business / operational field. Not personal data under this plan. |
| `timezone` | enum: "America/Bogota", "America/New_York" | optional | America/Bogota or America/New_York, matching the location. | **No.** Business / operational field. Not personal data under this plan. |

## `stock_threshold_crossed`

**Description:** Chain CSV edge: quantity_before >= 10 and quantity_after < 10. The weekly pipeline ignores this type.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `location_scope` | const "chain" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `product_id` | integer (minimum 1) | required | Inventory product primary key. | **No.** Integer inventory id. |
| `product_name` | string (minLength 1) | required | Catalogue name of the ingredient or SKU. | **No.** Ingredient / SKU catalogue label. Not a person name. |
| `quantity_after` | integer (minimum 0) | required | On-hand quantity after the change. | **No.** Business / operational field. Not personal data under this plan. |
| `quantity_before` | integer (minimum 0) | required | On-hand quantity before the change. | **No.** Business / operational field. Not personal data under this plan. |
| `threshold` | const 10 | required | Alert threshold (API default 10). | **No.** Business / operational field. Not personal data under this plan. |
| `unit` | string (minLength 1) | required | Unit of measure. | **No.** Business / operational field. Not personal data under this plan. |

## `stock_threshold_cleared`

**Description:** Chain CSV edge: quantity_before < 10 and quantity_after >= 10.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `location_scope` | const "chain" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `product_id` | integer (minimum 1) | required | Inventory product primary key. | **No.** Integer inventory id. |
| `product_name` | string (minLength 1) | required | Catalogue name of the ingredient or SKU. | **No.** Ingredient / SKU catalogue label. Not a person name. |
| `quantity_after` | integer (minimum 0) | required | On-hand quantity after the change. | **No.** Business / operational field. Not personal data under this plan. |
| `quantity_before` | integer (minimum 0) | required | On-hand quantity before the change. | **No.** Business / operational field. Not personal data under this plan. |
| `threshold` | const 10 | required | Alert threshold (API default 10). | **No.** Business / operational field. Not personal data under this plan. |
| `unit` | string (minLength 1) | required | Unit of measure. | **No.** Business / operational field. Not personal data under this plan. |

## `inventory_validation_failed`

**Description:** 422 on an inventory or order body. loc and pydantic type only. IP-3.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `fields` | array (minItems 1; maxItems 20; items: object (nested allowlist)) | required | Validation error locations (no submitted values). | **Sanitized.** Array of `{loc, error_type}`. Submitted values stripped. If a value cannot be stripped, omit the event. |
| `http_status` | const 422 | required | HTTP status, or 0 on network failure. | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | const "none" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `method` | enum: "GET", "POST", "PATCH" | required | HTTP method. | **No.** Business / operational field. Not personal data under this plan. |
| `route_template` | enum: "/inventory", "/inventory/{product_id}", "/inventory/alerts", "/orders" | required | Matched API route template. | **Sanitized.** Matched route pattern. Never the raw URL with query or a concrete email. |

Nested allowlist for `fields[]` (also `additionalProperties: false`):

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `error_type` | string (minLength 1; maxLength 64) | required | Pydantic / validator error type. | **No.** Pydantic error type string. |
| `loc` | string (pattern `^[A-Za-z0-9_.]+$`) | required | Dotted location in the request schema. | **Sanitized.** Dotted schema location (`body.quantity`). Never the rejected value. |

## `direct_stock_edit_rejected`

**Description:** Direct stock change or alert threshold the API refuses. CSV is unchanged. IP-4.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `http_status` | const 400 | required | HTTP status, or 0 on network failure. | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | const "chain" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `reason` | enum: "below_zero", "product_not_found", "negative_alert_threshold" | required | Closed-enum reason for this event. | **No.** Business / operational field. Not personal data under this plan. |
| `attempted_threshold` | integer | optional | Rejected negative alert threshold. | **No.** Rejected negative alert threshold. |
| `delta` | integer | optional | Signed integer change applied (never 0 on a successful adjust). | **No.** Business / operational field. Not personal data under this plan. |
| `product_id` | integer (minimum 1) | optional | Inventory product primary key. | **No.** Integer inventory id. |
| `product_name` | string (minLength 1) | optional | Catalogue name of the ingredient or SKU. | **No.** Ingredient / SKU catalogue label. Not a person name. |
| `quantity_before` | integer (minimum 0) | optional | On-hand quantity before the change. | **No.** Business / operational field. Not personal data under this plan. |

## `inbound_order_created`

**Description:** One event per inbound line. Pipeline sums payload.cost into total_purchase_cost.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `approval_required` | const false | required | Whether Procurement approval was required. | **No.** Business / operational field. Not personal data under this plan. |
| `approval_state` | const "not_required" | required | Approval workflow state. | **No.** Business / operational field. Not personal data under this plan. |
| `category` | enum: "proteins", "vegetables_fruit", "beverages_packaging", "imported_sauces", "cleaning", "other" | required | Procurement category for the line. | **No.** Business / operational field. Not personal data under this plan. |
| `cost` | number (minimum 0) | required | Money amount in the location currency. | **No.** Business / operational field. Not personal data under this plan. |
| `country` | enum: "Colombia", "United States" | required | Colombia or United States, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `currency` | enum: "COP", "USD" | required | COP or USD, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `fx_status` | enum: "recorded", "missing" | required | Whether a USD conversion was recorded. | **No.** Business / operational field. Not personal data under this plan. |
| `line_index` | integer (minimum 0) | required | Zero-based line number inside the order. | **No.** Business / operational field. Not personal data under this plan. |
| `list_cost` | number (minimum 0) | required | List cost before surcharge, in location currency. | **No.** Business / operational field. Not personal data under this plan. |
| `location_id` | string (roster location_id) | required | Roster id for one of the 14 restaurants. | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | const "location" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `order_id` | string (minLength 1) | required | Inbound or outbound order identifier. | **No.** Internal order id. |
| `order_kind` | enum: "scheduled", "emergency" | required | Order class (scheduled, emergency, …). | **No.** Business / operational field. Not personal data under this plan. |
| `product_id` | integer (minimum 1) | required | Inventory product primary key. | **No.** Integer inventory id. |
| `product_name` | string (minLength 1) | required | Catalogue name of the ingredient or SKU. | **No.** Ingredient / SKU catalogue label. Not a person name. |
| `quantity` | integer (minimum 1) | required | Quantity in `unit`. | **No.** Business / operational field. Not personal data under this plan. |
| `supplier_id` | string (pattern `^sup_[a-z0-9_]{2,64}$`) | required | Opaque supplier id (`sup_…`). | **No.** Opaque `sup_…` business id. |
| `surcharge_rate` | const 0 | required | Emergency surcharge rate applied. | **No.** Business / operational field. Not personal data under this plan. |
| `timezone` | enum: "America/Bogota", "America/New_York" | required | America/Bogota or America/New_York, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `unit` | string (minLength 1) | required | Unit of measure. | **No.** Business / operational field. Not personal data under this plan. |
| `unit_price` | number (minimum 0) | required | Unit price in the location currency. | **No.** Business / operational field. Not personal data under this plan. |
| `amount_usd` | number (minimum 0) | optional | Converted USD amount when fx was recorded. | **No.** Business / operational field. Not personal data under this plan. |
| `fx_rate_usd_per_local` | number | optional | USD per local currency unit when recorded. | **No.** Business / operational field. Not personal data under this plan. |

## `outbound_order_created`

**Description:** One event per outbound line. Guest tickets use sale_completed.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `cost` | number (minimum 0) | required | Money amount in the location currency. | **No.** Business / operational field. Not personal data under this plan. |
| `country` | enum: "Colombia", "United States" | required | Colombia or United States, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `currency` | enum: "COP", "USD" | required | COP or USD, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `line_index` | integer (minimum 0) | required | Zero-based line number inside the order. | **No.** Business / operational field. Not personal data under this plan. |
| `location_id` | string (roster location_id) | required | Roster id for one of the 14 restaurants. | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | const "location" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `order_id` | string (minLength 1) | required | Inbound or outbound order identifier. | **No.** Internal order id. |
| `product_id` | integer (minimum 1) | required | Inventory product primary key. | **No.** Integer inventory id. |
| `product_name` | string (minLength 1) | required | Catalogue name of the ingredient or SKU. | **No.** Ingredient / SKU catalogue label. Not a person name. |
| `protein_class` | enum: "main_protein", "premium_protein", "none" | required | Protein class enum for cover and waste rules. | **No.** Business / operational field. Not personal data under this plan. |
| `quantity` | integer (minimum 1) | required | Quantity in `unit`. | **No.** Business / operational field. Not personal data under this plan. |
| `reason` | enum: "kitchen_consumption", "transfer", "other" | required | Closed-enum reason for this event. | **No.** Business / operational field. Not personal data under this plan. |
| `timezone` | enum: "America/Bogota", "America/New_York" | required | America/Bogota or America/New_York, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `unit` | string (minLength 1) | required | Unit of measure. | **No.** Business / operational field. Not personal data under this plan. |
| `destination_location_id` | string (roster location_id) | optional | Roster id of the receiving location on a transfer outbound. | **No.** Business / operational field. Not personal data under this plan. |

## `stock_waste_registered`

**Description:** Shift-close waste log. Pipeline sums payload.cost into total_waste_cost.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `cost` | number (minimum 0) | required | Money amount in the location currency. | **No.** Business / operational field. Not personal data under this plan. |
| `country` | enum: "Colombia", "United States" | required | Colombia or United States, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `currency` | enum: "COP", "USD" | required | COP or USD, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `location_id` | string (roster location_id) | required | Roster id for one of the 14 restaurants. | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | const "location" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `product_id` | integer (minimum 1) | required | Inventory product primary key. | **No.** Integer inventory id. |
| `product_name` | string (minLength 1) | required | Catalogue name of the ingredient or SKU. | **No.** Ingredient / SKU catalogue label. Not a person name. |
| `protein_class` | enum: "main_protein", "premium_protein", "none" | required | Protein class enum for cover and waste rules. | **No.** Business / operational field. Not personal data under this plan. |
| `quantity` | number | required | Quantity in `unit`. | **No.** Business / operational field. Not personal data under this plan. |
| `shift_code` | string (minLength 1) | required | Shift identifier for the waste log (not a person name). | **No.** Shift code from the roster system. Not a person name. |
| `timezone` | enum: "America/Bogota", "America/New_York" | required | America/Bogota or America/New_York, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `training_waste` | boolean | required | Whether the waste was recorded as training waste. | **No.** Business / operational field. Not personal data under this plan. |
| `unit` | string (minLength 1) | required | Unit of measure. | **No.** Business / operational field. Not personal data under this plan. |
| `waste_category` | enum: "expiration", "kitchen_error", "unexplained_shrinkage" | required | Waste classification enum. | **No.** Business / operational field. Not personal data under this plan. |
| `note` | string (minLength 1) | optional | Optional operational waste code. Free-text person names are stripped before emit. | **Sanitized.** Operational code only. Strip free-text that could name a person. If the note cannot be reduced to a non-PII code, omit `note` or omit the event. |

## `stock_threshold_triggered`

**Description:** Location-scoped downward crossing, or protein cover under 3 days. Pipeline counts rows.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `country` | enum: "Colombia", "United States" | required | Colombia or United States, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `currency` | enum: "COP", "USD" | required | COP or USD, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `edge` | const "crossed_below" | required | Threshold edge that fired (`crossed_below`). | **No.** Business / operational field. Not personal data under this plan. |
| `location_id` | string (roster location_id) | required | Roster id for one of the 14 restaurants. | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | const "location" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `product_id` | integer (minimum 1) | required | Inventory product primary key. | **No.** Integer inventory id. |
| `product_name` | string (minLength 1) | required | Catalogue name of the ingredient or SKU. | **No.** Ingredient / SKU catalogue label. Not a person name. |
| `quantity_after` | number (minimum 0) | required | On-hand quantity after the change. | **No.** Business / operational field. Not personal data under this plan. |
| `quantity_before` | number (minimum 0) | required | On-hand quantity before the change. | **No.** Business / operational field. Not personal data under this plan. |
| `reason` | enum: "quantity_below_api_threshold", "protein_cover_below_3_days" | required | Closed-enum reason for this event. | **No.** Business / operational field. Not personal data under this plan. |
| `threshold` | number (minimum 0) | required | Alert threshold (API default 10). | **No.** Business / operational field. Not personal data under this plan. |
| `timezone` | enum: "America/Bogota", "America/New_York" | required | America/Bogota or America/New_York, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `unit` | string (minLength 1) | required | Unit of measure. | **No.** Business / operational field. Not personal data under this plan. |
| `cover_days_remaining` | number (minimum 0) | optional | Days of protein cover remaining when the monitor fired. | **No.** Business / operational field. Not personal data under this plan. |

## `ingredient_price_variance_detected`

**Description:** Previous unit price for product_id + supplier_id + currency moved by at least 1 percent. Pipeline counts rows.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `country` | enum: "Colombia", "United States" | required | Colombia or United States, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `currency` | enum: "COP", "USD" | required | COP or USD, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `location_id` | string (roster location_id) | required | Roster id for one of the 14 restaurants. | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | const "location" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `order_id` | string (minLength 1) | required | Inbound or outbound order identifier. | **No.** Internal order id. |
| `previous_unit_price` | number | required | Prior unit price for variance detection. | **No.** Prior unit price. |
| `product_id` | integer (minimum 1) | required | Inventory product primary key. | **No.** Integer inventory id. |
| `product_name` | string (minLength 1) | required | Catalogue name of the ingredient or SKU. | **No.** Ingredient / SKU catalogue label. Not a person name. |
| `supplier_id` | string (pattern `^sup_[a-z0-9_]{2,64}$`) | required | Opaque supplier id (`sup_…`). | **No.** Opaque `sup_…` business id. |
| `timezone` | enum: "America/Bogota", "America/New_York" | required | America/Bogota or America/New_York, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `unit_price` | number (minimum 0) | required | Unit price in the location currency. | **No.** Business / operational field. Not personal data under this plan. |
| `variance_pct` | number | required | Percent change in unit price. | **No.** Business / operational field. Not personal data under this plan. |

## `sale_completed`

**Description:** One closed ticket. points_earned is floor(amount/10000) for COP and floor(amount/10) for USD.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `amount` | number | required | Ticket total in location currency. | **No.** Business / operational field. Not personal data under this plan. |
| `business_date` | string (pattern `^\d{4}-\d{2}-\d{2}$`) | required | Local business date for the sale. | **No.** Business / operational field. Not personal data under this plan. |
| `channel` | enum: "in_store", "delivery", "digital_app" | required | Sales or report channel. | **No.** Business / operational field. Not personal data under this plan. |
| `country` | enum: "Colombia", "United States" | required | Colombia or United States, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `covers` | const 1 | required | Guest covers on the ticket. | **No.** Business / operational field. Not personal data under this plan. |
| `covers_source` | enum: "pos", "defaulted_to_one" | required | Whether covers came from the POS or were defaulted to one. | **No.** Business / operational field. Not personal data under this plan. |
| `currency` | enum: "COP", "USD" | required | COP or USD, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `fx_status` | enum: "recorded", "missing" | required | Whether a USD conversion was recorded. | **No.** Business / operational field. Not personal data under this plan. |
| `lines` | array (minItems 1; items: object (nested allowlist)) | required | Array of menu lines on the ticket. | **No.** Catalogue lines only. No guest identity inside a line. Nested allowlist below. |
| `location_id` | string (roster location_id) | required | Roster id for one of the 14 restaurants. | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | const "location" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `loyalty_attached` | boolean | required | Whether Brasa Points was attached on the ticket. | **No.** Whether Brasa Points was attached. |
| `points_earned` | integer (minimum 0) | required | Points computed on the ticket. | **No.** Points computed on the ticket. |
| `ticket_id` | string (minLength 1) | required | Opaque POS / digital ticket id. | **No.** Opaque ticket id. Not a guest identity. |
| `timezone` | enum: "America/Bogota", "America/New_York" | required | America/Bogota or America/New_York, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `amount_usd` | number (minimum 0) | optional | Converted USD amount when fx was recorded. | **No.** Business / operational field. Not personal data under this plan. |
| `customer_id` | string (pattern `^cus_[A-Za-z0-9]{8,}$`) | optional | Opaque guest account id when identified. | **Pseudonymous.** Opaque `cus_…` token only. Never email, phone, or guest name. If only a real-world identity is available, omit the event. |
| `fx_rate_usd_per_local` | number | optional | USD per local currency unit when recorded. | **No.** Business / operational field. Not personal data under this plan. |
| `loyalty_account_id` | string (pattern `^loy_[A-Za-z0-9]{8,}$`) | optional | Opaque digital loyalty account id. | **Pseudonymous.** Opaque `loy_…` account id only. Never stamp-card holder name or phone. If only a real-world identity is available, omit the event. |

Nested allowlist for `lines[]` (also `additionalProperties: false`):

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `line_amount` | number (minimum 0) | required | Line total in location currency. | **No.** Line total in location currency. |
| `menu_item_name` | string (minLength 1) | required | Menu item catalogue name. | **No.** Menu catalogue label. Not a guest name. |
| `quantity` | integer (minimum 1) | required | Quantity in `unit`. | **No.** Business / operational field. Not personal data under this plan. |
| `menu_item_id` | string (minLength 1) | optional | Menu catalogue id for the line. | **No.** Menu catalogue id. |

## `location_sales_silence_detected`

**Description:** Open location with no sale_completed for 45 minutes. Reuse id for the episode.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `business_date` | string (pattern `^\d{4}-\d{2}-\d{2}$`) | required | Local business date for the sale. | **No.** Business / operational field. Not personal data under this plan. |
| `country` | enum: "Colombia", "United States" | required | Colombia or United States, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `currency` | enum: "COP", "USD" | required | COP or USD, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `evaluated_at` | string (ISO 8601 UTC) | required | When the monitor evaluated (UTC). | **No.** Business / operational field. Not personal data under this plan. |
| `location_id` | string (roster location_id) | required | Roster id for one of the 14 restaurants. | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | const "location" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `open_local_end` | const "22:00" | required | Local close time. | **No.** Business / operational field. Not personal data under this plan. |
| `open_local_start` | const "11:00" | required | Local open time. | **No.** Business / operational field. Not personal data under this plan. |
| `opening_hours_source` | const "telemetry-plan.v1" | required | Binding that defines open hours. | **No.** Business / operational field. Not personal data under this plan. |
| `sale_count` | const 0 | required | Always 0 on a silence episode. | **No.** Business / operational field. Not personal data under this plan. |
| `silence_started_at` | string (ISO 8601 UTC) | required | When the no-sales episode began (UTC). | **No.** Business / operational field. Not personal data under this plan. |
| `threshold_minutes` | const 45 | required | Silence gap threshold in minutes (45). | **No.** Business / operational field. Not personal data under this plan. |
| `timezone` | enum: "America/Bogota", "America/New_York" | required | America/Bogota or America/New_York, matching the location. | **No.** Business / operational field. Not personal data under this plan. |

## `loyalty_points_redeemed`

**Description:** Redemption in multiples of 5 points once balance_before is at least 15. 5 points discount 20000 COP or 20 USD.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `balance_before` | integer (minimum 15) | required | Point balance before redemption. | **No.** Balance before redemption. |
| `country` | enum: "Colombia", "United States" | required | Colombia or United States, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `currency` | enum: "COP", "USD" | required | COP or USD, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `discount_amount` | number | required | Discount in location currency. | **No.** Discount in location currency. |
| `location_id` | string (roster location_id) | required | Roster id for one of the 14 restaurants. | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | const "location" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `loyalty_account_id` | string (pattern `^loy_[A-Za-z0-9]{8,}$`) | required | Opaque digital loyalty account id. | **Pseudonymous.** Opaque `loy_…` account id only. Never stamp-card holder name or phone. If only a real-world identity is available, omit the event. |
| `points` | integer (minimum 5) | required | Loyalty points redeemed. | **No.** Loyalty points redeemed. |
| `ticket_id` | string (minLength 1) | required | Opaque POS / digital ticket id. | **No.** Opaque ticket id. Not a guest identity. |
| `timezone` | enum: "America/Bogota", "America/New_York" | required | America/Bogota or America/New_York, matching the location. | **No.** Business / operational field. Not personal data under this plan. |

## `loyalty_card_transferred`

**Description:** One-time physical stamp card transfer onto an app account, at a location.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `country` | enum: "Colombia", "United States" | required | Colombia or United States, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `currency` | enum: "COP", "USD" | required | COP or USD, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `from_medium` | const "physical_card" | required | Source medium of the transfer. | **No.** Always `physical_card` for this transfer event. |
| `location_id` | string (roster location_id) | required | Roster id for one of the 14 restaurants. | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | const "location" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `loyalty_account_id` | string (pattern `^loy_[A-Za-z0-9]{8,}$`) | required | Opaque digital loyalty account id. | **Pseudonymous.** Opaque `loy_…` account id only. Never stamp-card holder name or phone. If only a real-world identity is available, omit the event. |
| `points_balance` | integer (minimum 0) | required | Points balance moved onto the app account. | **No.** Integer point balance moved onto the app account. |
| `timezone` | enum: "America/Bogota", "America/New_York" | required | America/Bogota or America/New_York, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `to_medium` | const "app" | required | Destination medium of the transfer. | **No.** Always `app` for this transfer event. |

## `user_login_succeeded`

**Description:** POST /auth/login or POST /auth/token after authenticate_user succeeds. UserID is users.id.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `location_scope` | const "none" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `method` | enum: "json", "oauth2_form" | required | HTTP method. | **No.** Business / operational field. Not personal data under this plan. |
| `route` | const "/auth/token" | required | Auth route that handled the credential (`/auth/login` or `/auth/token`). | **Sanitized.** Auth route template/path without query. Never the email used to sign in. |

## `user_login_failed`

**Description:** 401 branch of the login handlers. No email or password.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `failure_reason` | enum: "invalid_credentials", "inactive_user" | required | Login failure class. | **Sanitized.** Enum `invalid_credentials` or `inactive_user` only. Never the password or email attempted. |
| `location_scope` | const "none" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `method` | enum: "json", "oauth2_form" | required | HTTP method. | **No.** Business / operational field. Not personal data under this plan. |
| `route` | const "/auth/token" | required | Auth route that handled the credential (`/auth/login` or `/auth/token`). | **Sanitized.** Auth route template/path without query. Never the email used to sign in. |

## `api_error_raised`

**Description:** 500 from handle_unhandled_error or 503 from handle_external_service_error.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `code` | const "service_unavailable" | required | Stable error code. | **No.** Business / operational field. Not personal data under this plan. |
| `http_status` | enum: 500, 503 | required | HTTP status, or 0 on network failure. | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | const "none" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `message` | string (minLength 1) | required | Public error message only. | **Sanitized.** Only the public `error_body` text. Never `str(exc)`, host, key, or query. If a public string is unavailable, omit the event. |
| `method` | enum: "GET", "POST", "PUT", "PATCH", "DELETE" | required | HTTP method. | **No.** Business / operational field. Not personal data under this plan. |
| `route_template` | string (pattern `^(/[A-Za-z0-9_./{}-]*\|unmatched)$`) | required | Matched API route template. | **Sanitized.** Matched route pattern. Never the raw URL with query or a concrete email. |

## `page_viewed`

**Description:** Public corporate home mount. path is /.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `app` | const "website" | required | Client app id (`website` or `backoffice`). | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | const "none" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `path` | const "/" | required | URL pathname without query or fragment. | **Sanitized.** Pathname without query or fragment. If a token or email would appear in the path, omit the event. |

## `auth_form_rejected`

**Description:** Staff form blocked a submit, or the matching HTTP 422 was shown. No email or password. The server does not emit a second copy.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `field` | enum: "password", "confirm_password", "form" | required | Which form field failed validation. | **Sanitized.** Form field name only. Never the submitted value. |
| `form` | const "password_change" | required | Which staff form rejected the submit. | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | const "none" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `reason` | enum: "validation", "mismatch", "too_short" | required | Closed-enum reason for this event. | **No.** Business / operational field. Not personal data under this plan. |

## `session_expired`

**Description:** JWT past exp. Emitted on ExpiredSignatureError before decode_access_token collapses the error. Distinct from user_login_failed.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `location_scope` | const "none" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `route_template` | string (pattern `^/[A-Za-z0-9_./{}-]+$`) | required | Matched API route template. | **Sanitized.** Matched route pattern. Never the raw URL with query or a concrete email. |

## `session_rejected`

**Description:** Invalid JWT, inactive subject, or a protected route opened with no token. Distinct from session_expired and user_login_failed.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `location_scope` | const "none" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `reason` | enum: "invalid_token", "inactive_user", "missing_token" | required | Closed-enum reason for this event. | **No.** Business / operational field. Not personal data under this plan. |
| `path` | string (pattern `^/[^?#]*$`) | optional | URL pathname without query or fragment. | **Sanitized.** Pathname without query or fragment. If a token or email would appear in the path, omit the event. |
| `route_template` | string (pattern `^/[A-Za-z0-9_./{}-]+$`) | optional | Matched API route template. | **Sanitized.** Matched route pattern. Never the raw URL with query or a concrete email. |

## `session_ended`

**Description:** Logout, or a later 401 cleared the stored token. Does not restate expired versus invalid.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `location_scope` | const "none" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `reason` | enum: "logout", "rejected_session" | required | Closed-enum reason for this event. | **No.** Business / operational field. Not personal data under this plan. |

## `account_updated`

**Description:** Register, profile save, or password change finished or was refused. No contact fields.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `action` | const "register" | required | Account update action. | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | const "none" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `outcome` | enum: "completed", "rejected" | required | Success or failure outcome. | **No.** Business / operational field. Not personal data under this plan. |
| `reason` | enum: "validation", "duplicate_email", "unauthorized", "api_error" | required | Closed-enum reason for this event. | **No.** Business / operational field. Not personal data under this plan. |

## `api_latency_recorded`

**Description:** One apiRequest, including network failure. route_template has no query string.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `duration_ms` | integer (minimum 0; maximum 3600000) | required | Elapsed milliseconds. | **No.** Business / operational field. Not personal data under this plan. |
| `http_status` | const 0 | required | HTTP status, or 0 on network failure. | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | const "none" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `method` | enum: "GET", "POST", "PUT", "PATCH", "DELETE" | required | HTTP method. | **No.** Business / operational field. Not personal data under this plan. |
| `outcome` | enum: "ok", "http_error", "network", "parse_error" | required | Success or failure outcome. | **No.** Business / operational field. Not personal data under this plan. |
| `route_template` | enum: "/auth/login", "/auth/token", "/auth/register", "/auth/me", "/users", "/users/{id}", "/profiles/me", "/locations/overview", "/inventory" | required | Matched API route template. | **Sanitized.** Matched route pattern. Never the raw URL with query or a concrete email. |

## `ui_latency_recorded`

**Description:** Session, panel, or form clock until success, error, or the effect was cancelled.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `duration_ms` | integer (minimum 0; maximum 3600000) | required | Elapsed milliseconds. | **No.** Business / operational field. Not personal data under this plan. |
| `kind` | enum: "session_check", "panel", "form" | required | UI timing clock kind. | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | const "none" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `name` | enum: "login_form", "register_form", "password_form" | required | UI timing clock name. | **No.** Business / operational field. Not personal data under this plan. |
| `outcome` | enum: "success", "error", "cancelled" | required | Success or failure outcome. | **No.** Business / operational field. Not personal data under this plan. |

## `client_exception_caught`

**Description:** Error boundary, window error, or unhandled rejection. error_name only. No message and no stack.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `app` | enum: "backoffice", "website" | required | Client app id (`website` or `backoffice`). | **No.** Business / operational field. Not personal data under this plan. |
| `catch_site` | enum: "error_boundary", "window_error", "unhandled_rejection" | required | Where the client exception was caught. | **No.** Business / operational field. Not personal data under this plan. |
| `error_name` | string (pattern `^[A-Za-z][A-Za-z0-9_]{0,63}$`) | required | JavaScript `Error.name` only. | **Sanitized.** `Error.name` only. Message, component stack, and rejection value are dropped. If only free-text exists, omit the event. |
| `location_scope` | const "none" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `path` | string (pattern `^/[^?#]*$`) | required | URL pathname without query or fragment. | **Sanitized.** Pathname without query or fragment. If a token or email would appear in the path, omit the event. |

## `section_viewed`

**Description:** Operator surface actually shown. required and ready are fixed per section id.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `app` | const "backoffice" | required | Client app id (`website` or `backoffice`). | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | const "none" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `path` | const "/account/change-password" | required | URL pathname without query or fragment. | **Sanitized.** Pathname without query or fragment. If a token or email would appear in the path, omit the event. |
| `ready` | const true | required | Whether the section UI is fully implemented. | **No.** Business / operational field. Not personal data under this plan. |
| `required` | const false | required | Whether operators must visit this section. | **No.** Business / operational field. Not personal data under this plan. |
| `section` | enum: "login", "register", "accessible_entry", "location_roster", "kitchen_inventory", "executive_sales", "account_profile", "account_password" | required | Backoffice section id. | **No.** Business / operational field. Not personal data under this plan. |

## `flow_step_recorded`

**Description:** One step of a staff flow. Abandoned and completed both close the flow_instance.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `flow_id` | enum: "staff_sign_in", "staff_register", "session_restore", "profile_edit", "password_change", "operations_review" | required | Staff flow identifier. | **No.** Business / operational field. Not personal data under this plan. |
| `flow_instance` | string (format uuid) | required | UUID for one attempt of the flow. | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | const "none" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `outcome` | enum: "started", "advanced", "completed", "abandoned" | required | Success or failure outcome. | **No.** Business / operational field. Not personal data under this plan. |
| `step` | string (pattern `^[a-z0-9_]{1,64}$`) | required | Step name inside the flow. | **No.** Business / operational field. Not personal data under this plan. |

## `employee_hired`

**Description:** Hire fact for country headcount. employee_id is opaque. No name.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `country` | enum: "Colombia", "United States" | required | Colombia or United States, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `effective_date` | string (pattern `^\d{4}-\d{2}-\d{2}$`) | required | Hire or separation effective date. | **No.** Business / operational field. Not personal data under this plan. |
| `employee_id` | string (pattern `^emp_[A-Za-z0-9]{6,}$`) | required | Opaque employee id (`emp_…`). | **Pseudonymous.** Opaque `emp_…` token only. Never legal name, national id, or email. If only a real-world identity is available, omit the event. |
| `employment_basis` | enum: "kitchen", "floor", "management", "support" | required | Employment basis (kitchen, floor, …). | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | const "none" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |

## `employee_separated`

**Description:** Leaver fact for people.turnover, segmented by country.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `country` | enum: "Colombia", "United States" | required | Colombia or United States, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `effective_date` | string (pattern `^\d{4}-\d{2}-\d{2}$`) | required | Hire or separation effective date. | **No.** Business / operational field. Not personal data under this plan. |
| `employee_id` | string (pattern `^emp_[A-Za-z0-9]{6,}$`) | required | Opaque employee id (`emp_…`). | **Pseudonymous.** Opaque `emp_…` token only. Never legal name, national id, or email. If only a real-world identity is available, omit the event. |
| `location_scope` | const "none" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `separation_kind` | enum: "resignation", "dismissal", "end_of_contract", "other" | required | How the employment ended. | **No.** Business / operational field. Not personal data under this plan. |

## `absence_recorded`

**Description:** Absence day or fraction for people.absenteeism. Holiday taken is absence_kind holiday.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `absence_date` | string (pattern `^\d{4}-\d{2}-\d{2}$`) | required | Date of the absence. | **No.** Business / operational field. Not personal data under this plan. |
| `absence_kind` | enum: "holiday", "sick", "unpaid", "other" | required | Absence kind (sick, holiday, …). | **No.** Business / operational field. Not personal data under this plan. |
| `country` | enum: "Colombia", "United States" | required | Colombia or United States, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `day_fraction` | number (maximum 1) | required | Fraction of a roster day absent. | **No.** Business / operational field. Not personal data under this plan. |
| `employee_id` | string (pattern `^emp_[A-Za-z0-9]{6,}$`) | required | Opaque employee id (`emp_…`). | **Pseudonymous.** Opaque `emp_…` token only. Never legal name, national id, or email. If only a real-world identity is available, omit the event. |
| `location_scope` | const "none" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |

## `roster_day_scheduled`

**Description:** Denominator day for absenteeism. One row per employee per scheduled day.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `country` | enum: "Colombia", "United States" | required | Colombia or United States, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `employee_id` | string (pattern `^emp_[A-Za-z0-9]{6,}$`) | required | Opaque employee id (`emp_…`). | **Pseudonymous.** Opaque `emp_…` token only. Never legal name, national id, or email. If only a real-world identity is available, omit the event. |
| `location_scope` | const "none" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `roster_date` | string (pattern `^\d{4}-\d{2}-\d{2}$`) | required | Scheduled roster day. | **No.** Business / operational field. Not personal data under this plan. |
| `scheduled` | const true | required | Always true for a roster day row. | **No.** Business / operational field. Not personal data under this plan. |

## `vacancy_opened`

**Description:** Vacancy open date. Paired with vacancy_filled for time to fill.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `country` | enum: "Colombia", "United States" | required | Colombia or United States, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `employment_basis` | enum: "kitchen", "floor", "management", "support" | required | Employment basis (kitchen, floor, …). | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | const "none" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `opened_on` | string (pattern `^\d{4}-\d{2}-\d{2}$`) | required | Vacancy open date. | **No.** Business / operational field. Not personal data under this plan. |
| `vacancy_id` | string (pattern `^vac_[A-Za-z0-9]{4,}$`) | required | Opaque vacancy id. | **No.** Opaque `vac_…` id. Never a candidate name. |

## `vacancy_filled`

**Description:** days_to_fill is filled_on minus opened_on in calendar days.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `country` | enum: "Colombia", "United States" | required | Colombia or United States, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `days_to_fill` | integer (minimum 0) | required | Calendar days from open to fill. | **No.** Business / operational field. Not personal data under this plan. |
| `filled_on` | string (pattern `^\d{4}-\d{2}-\d{2}$`) | required | Vacancy fill date. | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | const "none" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `opened_on` | string (pattern `^\d{4}-\d{2}-\d{2}$`) | required | Vacancy open date. | **No.** Business / operational field. Not personal data under this plan. |
| `vacancy_id` | string (pattern `^vac_[A-Za-z0-9]{4,}$`) | required | Opaque vacancy id. | **No.** Opaque `vac_…` id. Never a candidate name. |

## `customer_preference_recorded`

**Description:** CRM preference. No free-text personal data.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `customer_id` | string (pattern `^cus_[A-Za-z0-9]{8,}$`) | required | Opaque guest account id when identified. | **Pseudonymous.** Opaque `cus_…` token only. Never email, phone, or guest name. If only a real-world identity is available, omit the event. |
| `location_scope` | const "none" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `preference_code` | enum: "diet", "favorite_menu_item", "preferred_channel", "preferred_language" | required | Which preference dimension was stored. | **No.** Business / operational field. Not personal data under this plan. |
| `preference_value` | enum: "in_store", "delivery", "digital_app" | required | Closed vocabulary value for that preference (max 80 chars). | **Sanitized.** Catalogue or closed vocabulary only (diet code, menu item id, channel, language). Never a free-text guest biography. If only free text is available, omit the event. |

## `recommendation_shown`

**Description:** Personalisation impression. customer_id is optional when the guest is anonymous.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `country` | enum: "Colombia", "United States" | required | Colombia or United States, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `currency` | enum: "COP", "USD" | required | COP or USD, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `location_id` | string (roster location_id) | required | Roster id for one of the 14 restaurants. | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | const "location" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `menu_item_name` | string (minLength 1) | required | Menu item catalogue name. | **No.** Menu catalogue label. Not a guest name. |
| `recommendation_id` | string (pattern `^recm_[A-Za-z0-9]{8,}$`) | required | Opaque recommendation id. | **No.** Opaque `recm_…` id. Not personal data. |
| `surface` | enum: "checkout", "kiosk", "app_home" | required | Where the recommendation was shown. | **No.** Business / operational field. Not personal data under this plan. |
| `timezone` | enum: "America/Bogota", "America/New_York" | required | America/Bogota or America/New_York, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `customer_id` | string (pattern `^cus_[A-Za-z0-9]{8,}$`) | optional | Opaque guest account id when identified. | **Pseudonymous.** Opaque `cus_…` token only. Never email, phone, or guest name. If only a real-world identity is available, omit the event. |

## `recommendation_accepted`

**Description:** Guest accepted the suggested menu item. recommendation_id matches the impression.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `accepted` | const true | required | Whether the guest accepted the suggestion. | **No.** Business / operational field. Not personal data under this plan. |
| `country` | enum: "Colombia", "United States" | required | Colombia or United States, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `currency` | enum: "COP", "USD" | required | COP or USD, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `location_id` | string (roster location_id) | required | Roster id for one of the 14 restaurants. | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | const "location" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `menu_item_name` | string (minLength 1) | required | Menu item catalogue name. | **No.** Menu catalogue label. Not a guest name. |
| `recommendation_id` | string (pattern `^recm_[A-Za-z0-9]{8,}$`) | required | Opaque recommendation id. | **No.** Opaque `recm_…` id. Not personal data. |
| `timezone` | enum: "America/Bogota", "America/New_York" | required | America/Bogota or America/New_York, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `customer_id` | string (pattern `^cus_[A-Za-z0-9]{8,}$`) | optional | Opaque guest account id when identified. | **Pseudonymous.** Opaque `cus_…` token only. Never email, phone, or guest name. If only a real-world identity is available, omit the event. |

## `recipe_update_published`

**Description:** Recipe push. locale es is the base language. en is an additional publish.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `locale` | enum: "es", "en" | required | Content locale. | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | const "none" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `recipe_id` | string (pattern `^rec_[a-z0-9_]{2,64}$`) | required | Opaque recipe id. | **No.** Opaque `rec_…` catalogue id. |
| `title` | string (minLength 1) | required | Recipe title. | **No.** Recipe title in the training catalogue. |
| `version` | integer (minimum 1) | required | Recipe version integer. | **No.** Business / operational field. Not personal data under this plan. |

## `recipe_update_acknowledged`

**Description:** One location confirms it has the recipe version. Coverage denominator is 14.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `country` | enum: "Colombia", "United States" | required | Colombia or United States, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `currency` | enum: "COP", "USD" | required | COP or USD, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `location_id` | string (roster location_id) | required | Roster id for one of the 14 restaurants. | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | const "location" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `recipe_id` | string (pattern `^rec_[a-z0-9_]{2,64}$`) | required | Opaque recipe id. | **No.** Opaque `rec_…` catalogue id. |
| `timezone` | enum: "America/Bogota", "America/New_York" | required | America/Bogota or America/New_York, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `version` | integer (minimum 1) | required | Recipe version integer. | **No.** Business / operational field. Not personal data under this plan. |

## `weekly_report_dispatched`

**Description:** Monday executive report send. floor_metric_ids must list every Phase 1 floor id.

**Allowlist enforcement:** `additionalProperties: false`.

| Name | Type | Required | Description | Sensitive / PII |
| --- | --- | --- | --- | --- |
| `audience` | const "executive" | required | Report audience. | **No.** Business / operational field. Not personal data under this plan. |
| `channel` | const "email" | required | Sales or report channel. | **No.** Business / operational field. Not personal data under this plan. |
| `deadline_local` | const "07:00" | required | Local deadline clock time. | **No.** Business / operational field. Not personal data under this plan. |
| `dispatched_at` | string (ISO 8601 UTC) | required | When the report was sent (UTC). | **No.** Business / operational field. Not personal data under this plan. |
| `floor_metric_ids` | array (uniqueItems; items: enum (34 values)) | required | Every CONTEXT.md mandatory metric id. | **No.** Business / operational field. Not personal data under this plan. |
| `location_scope` | const "none" | required | Whether the fact is chain-wide, location-scoped, or none. | **No.** Business / operational field. Not personal data under this plan. |
| `on_time` | boolean | required | Whether dispatch beat Monday 07:00 America/Bogota. | **No.** Business / operational field. Not personal data under this plan. |
| `timezone` | const "America/Bogota" | required | America/Bogota or America/New_York, matching the location. | **No.** Business / operational field. Not personal data under this plan. |
| `week_start` | string (pattern `^\d{4}-\d{2}-\d{2}$`) | required | Chain-week Monday date. | **No.** Business / operational field. Not personal data under this plan. |

