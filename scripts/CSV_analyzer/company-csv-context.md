# CONTEXT — Data Analysis Utility: Incident Report Processor

## Company: Nexova

---

## Your Company

**Nexova** is a human resources consulting and outsourcing firm based in Valencia, Spain, with an office in Miami. Among its business lines, Nexova operates a **customer support outsourcing service**: 30 agents handle incidents on behalf of Nexova's clients (technology, retail, and finance companies) via phone, email, and web chat.

You are part of the **Nexova AI Engineering team**, working under the direction of **Sergio Molina (CTO)**. Your point of contact for this project is **Roberto Díaz (Customer Support Lead)**.

Roberto's team uses a legacy helpdesk to log every support ticket received. A month of data has been exported as a CSV for analysis — your test file has **1,000 rows**. The average resolution SLA committed to clients is **24 hours**; currently the average is 48 hours. Roberto needs this analysis to understand the ticket backlog and satisfaction gaps before the next client review.

The goal of your script is to give Roberto and the supervisors a clear, accurate picture of the ticket data — without sending any of it to an external AI tool.

---

## CSV Structure

**Filename:** `incidents.csv`  
**Encoding:** UTF-8  
**Separator:** comma (`,`)  
**Header row:** yes (row 1)

| Field                | Type    | Required | Allowed values / format                                 |
| -------------------- | ------- | -------- | ------------------------------------------------------- |
| `ticket_id`          | string  | ✅       | Unique ID, format `NXV-XXXXXX` (e.g. `NXV-000001`)      |
| `date`               | string  | ✅       | `YYYY-MM-DD`                                            |
| `client_company`     | string  | ✅       | Name of the client company being served (free text)     |
| `category`           | string  | ✅       | See categories below                                    |
| `description`        | string  | ✅       | Free text, min 5 characters                             |
| `agent_id`           | string  | ✅       | Format `AGT-XX` (e.g. `AGT-07`)                         |
| `status`             | string  | ✅       | `OPEN`, `CLOSED`, `DISCARDED`                           |
| `customer_email`     | string  | ✅       | Valid email address of the end customer (**sensitive**) |
| `satisfaction_score` | integer | ❌\*     | Integer 1–5. **Required if** `status = CLOSED`          |

\*`satisfaction_score` is optional in the CSV structure, but a `CLOSED` record without it is considered **incomplete**.

> ⚠️ The `customer_email` field contains real email addresses and is why this file cannot be shared with external AI tools. Your script must never print, log, or export individual email addresses in any of its outputs.

### Valid categories

| Code        | Description                                   |
| ----------- | --------------------------------------------- |
| `TECHNICAL` | Technical issue with a product or system      |
| `BILLING`   | Billing query or dispute                      |
| `ACCESS`    | Login, permissions, or account access problem |
| `HR_QUERY`  | HR or policy question from a client's staff   |
| `COMPLAINT` | Formal complaint about service quality        |

---

## Rules for Invalid Records

A record must be flagged as **invalid** if any of the following is true:

| Rule                                          | Description                                              |
| --------------------------------------------- | -------------------------------------------------------- |
| Missing `client_company`                      | The field is empty                                       |
| Missing or invalid `category`                 | The field is empty or not one of the 5 valid categories  |
| Empty `description`                           | The field is empty or has fewer than 5 characters        |
| Missing or invalid `agent_id`                 | The field is empty or does not match the format `AGT-XX` |
| Missing or invalid `customer_email`           | The field is empty or does not contain `@`               |
| `status = CLOSED` and no `satisfaction_score` | Closed ticket without a recorded score                   |
| `satisfaction_score` out of range             | Value present but not between 1 and 5 (inclusive)        |

Your script must report how many records fall into each rule type.

---

## Data Distribution (test file provided)

The `incidents-nexova.csv` file has been sent as an attachment (ver ficheros `incidents-nexova.csv`). The following values describe its contents and are what your script must produce exactly.

**Total rows:** 100

**Valid records: 96**
| Category | Count |
|---|---|
| `TECHNICAL` | 28 |
| `BILLING` | 18 |
| `ACCESS` | 21 |
| `HR_QUERY` | 17 |
| `COMPLAINT` | 12 |

| Status      | Count |
| ----------- | ----- |
| `OPEN`      | 27    |
| `CLOSED`    | 56    |
| `DISCARDED` | 13    |

**Invalid records: 4**
| Rule triggered | Count |
|---|---|
| Missing `client_company` | 1 |
| Missing or invalid `category` | 1 |
| Missing or invalid `customer_email` | 1 |
| `status = CLOSED` with no `satisfaction_score` | 1 |

**Satisfaction scores (56 closed records)**
| Score | Count |
|---|---|
| 1 | 2 |
| 2 | 5 |
| 3 | 10 |
| 4 | 22 |
| 5 | 17 |
Average: **3.84**

---

## Expected Output

When the student runs `python analyze.py incidents-nexova.csv` against the provided file, the console output must show the following values:

```
============================================================
  NEXOVA — SUPPORT TICKET ANALYSIS
  Source file: incidents-nexova.csv
============================================================

TOTAL RECORDS IN FILE .......... 100
  ├─ Valid records ................ 96
  └─ Invalid / incomplete .......... 4

INVALID RECORDS BREAKDOWN
  ├─ Missing client_company ........ 1
  ├─ Invalid or missing category ... 1
  ├─ Invalid or missing email ...... 1
  └─ Closed ticket, no score ....... 1

BREAKDOWN BY CATEGORY (valid records)
  ├─ TECHNICAL .................... 28  (29.2%)
  ├─ BILLING ...................... 18  (18.8%)
  ├─ ACCESS ....................... 21  (21.9%)
  ├─ HR_QUERY ..................... 17  (17.7%)
  └─ COMPLAINT .................... 12  (12.5%)

BREAKDOWN BY STATUS (valid records)
  ├─ OPEN ......................... 27  (28.1%)
  ├─ CLOSED ....................... 56  (58.3%)
  └─ DISCARDED .................... 13  (13.5%)

SATISFACTION INDEX (closed tickets)
  Scored tickets: 56 of 56
  Average score: 3.84 / 5.00
  ├─ Score 1 (Very dissatisfied) ... 2
  ├─ Score 2 (Dissatisfied) ........ 5
  ├─ Score 3 (Neutral) ............ 10
  ├─ Score 4 (Satisfied) .......... 22
  └─ Score 5 (Very satisfied) ..... 17

============================================================
Export results to CSV? [y / n]:
```

> **Note:** Minor formatting differences (spacing, box-drawing characters) are acceptable, but all numeric values must match exactly.

---

## Stakeholder Note

> **From Roberto Díaz (Customer Support Lead):**
> _"We need this before the client review on Friday. The CSV export should have one metric per row — I'll paste it into the client report template. Most importantly: do not include any customer email in any output. Even the error log. If a record has an invalid email, flag it as 'invalid email' but never print the address itself."_

---

## Repository Path

```
incidents-analysis/CONTEXT-nexova.md
```

---

_Internal document — 4Geeks Academy · AI Engineering Track_  
_For exclusive use in programme project generation_