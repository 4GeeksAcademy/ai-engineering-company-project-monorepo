# CONTEXT — Data Analysis Utility: Incident Report Processor

## Company: TrackFlow

---

## Your Company

**TrackFlow** is a last-mile delivery and warehouse management company operating in Los Angeles (USA) and Zaragoza (Spain). Its clients are e-commerce brands that outsource their entire logistics operation.

You are part of the **TrackFlow Tech** internal unit, working under the direction of **Thomas Harry (CEO)** and **the internal tech lead**. Your point of contact for this project is **Valentina Cruz (CX Manager)**.

Valentina's team of 15 agents handles incidents from two types of customers: the **brands (B2B)** that contract TrackFlow's services, and the **end consumers (B2C)** who receive the parcels. All incidents are currently tracked in a legacy helpdesk. A month of data has been exported as a CSV for analysis — your test file has **1,000 rows**.

The incident volume is high: 80% of queries could be automated, but first the team needs to understand what's coming in. This analysis is the foundation for the first-line support agent that will be built in a later phase. Your script must give Valentina a clear picture of volume, quality, and satisfaction before that work begins.

---

## CSV Structure

**Filename:** `incidents.csv`  
**Encoding:** UTF-8  
**Separator:** comma (`,`)  
**Header row:** yes (row 1)

| Field                | Type    | Required | Allowed values / format                                       |
| -------------------- | ------- | -------- | ------------------------------------------------------------- |
| `incident_id`        | string  | ✅       | Unique ID, format `TRF-XXXXXX` (e.g. `TRF-000001`)            |
| `date`               | string  | ✅       | `YYYY-MM-DD`                                                  |
| `country`            | string  | ✅       | `US` or `ES`                                                  |
| `customer_type`      | string  | ✅       | `B2B` or `B2C`                                                |
| `tracking_number`    | string  | ✅       | Carrier tracking number, min 8 characters                     |
| `carrier`            | string  | ✅       | See carriers below                                            |
| `category`           | string  | ✅       | See categories below                                          |
| `description`        | string  | ✅       | Free text, min 5 characters                                   |
| `status`             | string  | ✅       | `OPEN`, `CLOSED`, `DISCARDED`                                 |
| `customer_email`     | string  | ✅       | Valid email address of the reporting customer (**sensitive**) |
| `satisfaction_score` | integer | ❌\*     | Integer 1–5. **Required if** `status = CLOSED`                |

\*`satisfaction_score` is optional in the CSV structure, but a `CLOSED` record without it is considered **incomplete**.

> ⚠️ The `customer_email` field contains real customer email addresses and is why this file cannot be shared with external AI tools. Your script must never print, log, or export individual email addresses in any output.

### Valid carriers

| Country | Carriers                            |
| ------- | ----------------------------------- |
| `US`    | `UPS`, `FEDEX`, `DHL_US`            |
| `ES`    | `MRW`, `SEUR`, `DHL_ES`, `LOCAL_ES` |

A record is **invalid** if the carrier is not in the valid list for its declared country.

### Valid categories

| Code               | Description                         |
| ------------------ | ----------------------------------- |
| `LOST_PARCEL`      | Parcel reported as lost             |
| `DELAYED_DELIVERY` | Delivery past the expected date     |
| `WRONG_ADDRESS`    | Parcel sent to an incorrect address |
| `RETURN_REQUEST`   | Customer requesting a return        |
| `DAMAGE`           | Product arrived damaged             |

---

## Rules for Invalid Records

A record must be flagged as **invalid** if any of the following is true:

| Rule                                          | Description                                                         |
| --------------------------------------------- | ------------------------------------------------------------------- |
| Missing or invalid `country`                  | Empty or not `US` / `ES`                                            |
| Missing or invalid `carrier`                  | Empty, unknown, or carrier does not operate in the declared country |
| Missing `tracking_number`                     | Empty or fewer than 8 characters                                    |
| Missing or invalid `category`                 | Empty or not one of the 5 valid categories                          |
| Empty `description`                           | Empty or fewer than 5 characters                                    |
| Missing or invalid `customer_email`           | Empty or does not contain `@`                                       |
| `status = CLOSED` and no `satisfaction_score` | Closed incident without a recorded score                            |
| `satisfaction_score` out of range             | Value present but not between 1 and 5 (inclusive)                   |

Your script must report how many records fall into each rule type.

---

## Data Distribution (test file provided)

The `incidents-trackflow.csv` file has been sent as an attachment (ver ficheros `incidents-trackflow.csv`). The following values describe its contents and are what your script must produce exactly.

**Total rows:** 100

**Valid records: 95**
| Category | Count |
|---|---|
| `LOST_PARCEL` | 14 |
| `DELAYED_DELIVERY` | 38 |
| `WRONG_ADDRESS` | 19 |
| `RETURN_REQUEST` | 17 |
| `DAMAGE` | 7 |

| Status      | Count |
| ----------- | ----- |
| `OPEN`      | 29    |
| `CLOSED`    | 52    |
| `DISCARDED` | 14    |

**Recommended metric (not required for grading):**

| Country | Count |
| ------- | ----- |
| `US`    | 50    |
| `ES`    | 45    |

**Invalid records: 5**
| Rule triggered | Count |
|---|---|
| Missing or invalid `tracking_number` | 1 |
| Carrier not valid for declared country | 1 |
| Missing or invalid `category` | 1 |
| Missing or invalid `customer_email` | 1 |
| `status = CLOSED` with no `satisfaction_score` | 1 |

**Satisfaction scores (52 closed records)**
| Score | Count |
|---|---|
| 1 | 6 |
| 2 | 11 |
| 3 | 15 |
| 4 | 14 |
| 5 | 6 |
Average: **3.06**

---

## Expected Output

When the student runs `python analyze.py incidents-trackflow.csv` against the provided file, the console output must show the values below for all **required** sections (totals, invalid breakdown, category, status, and satisfaction). The `BREAKDOWN BY COUNTRY` block is **recommended** for TrackFlow — useful context for stakeholders, but not required for a passing submission.

```
============================================================
  TRACKFLOW — INCIDENT REPORT ANALYSIS
  Source file: incidents-trackflow.csv
============================================================

TOTAL RECORDS IN FILE .......... 100
  ├─ Valid records ................ 95
  └─ Invalid / incomplete .......... 5

INVALID RECORDS BREAKDOWN
  ├─ Invalid tracking number ....... 1
  ├─ Carrier/country mismatch ...... 1
  ├─ Invalid or missing category ... 1
  ├─ Invalid or missing email ...... 1
  └─ Closed incident, no score ..... 1

BREAKDOWN BY CATEGORY (valid records)
  ├─ LOST_PARCEL .................. 14  (14.7%)
  ├─ DELAYED_DELIVERY ............. 38  (40.0%)
  ├─ WRONG_ADDRESS ................ 19  (20.0%)
  ├─ RETURN_REQUEST ............... 17  (17.9%)
  └─ DAMAGE ........................ 7   (7.4%)

BREAKDOWN BY STATUS (valid records)
  ├─ OPEN ......................... 29  (30.5%)
  ├─ CLOSED ....................... 52  (54.7%)
  └─ DISCARDED .................... 14  (14.7%)

BREAKDOWN BY COUNTRY (valid records) — recommended, not required
  ├─ US ........................... 50  (52.6%)
  └─ ES ........................... 45  (47.4%)

SATISFACTION INDEX (closed incidents)
  Scored incidents: 52 of 52
  Average score: 3.06 / 5.00
  ├─ Score 1 (Very dissatisfied) ... 6
  ├─ Score 2 (Dissatisfied) ....... 11
  ├─ Score 3 (Neutral) ............ 15
  ├─ Score 4 (Satisfied) .......... 14
  └─ Score 5 (Very satisfied) ...... 6

============================================================
Export results to CSV? [y / n]:
```

> **Note:** Minor formatting differences (spacing, box-drawing characters) are acceptable, but all numeric values in **required** sections must match exactly. The country breakdown is a **recommended** TrackFlow extension — include it if you want stakeholder-ready output, but it is not evaluated against the project README rubric.

---

## Stakeholder Note

> **From Valentina Cruz (CX Manager):**
> _"The satisfaction scores for logistics are always lower than average — that's normal in our sector. What I need to understand is whether the problem is more severe in the US or Spain, and whether it's concentrated in specific categories like_ `DELAYED_DELIVERY` _or_ `LOST_PARCEL`_. A breakdown by country in the console output would help me — include it if you can. The CSV export should have one row per metric — I'll use it in the client report. And same as always — no customer emails in any output, ever."_

---

## Repository Path

```
incidents-analysis/CONTEXT-trackflow.md
```

---

_Internal document — 4Geeks Academy · AI Engineering Track_  
_For exclusive use in programme project generation_
