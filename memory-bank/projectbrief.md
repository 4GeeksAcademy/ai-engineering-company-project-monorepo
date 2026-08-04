# Project Brief

## Business context

This monorepo supports Nexova, a human resources consulting and talent acquisition company operating in Spain and the United States.

The current work audited in this session spans three areas:
1. `uis/landing_page`: public-facing corporate website and talent application form.
2. `scripts`: core TypeScript business logic utilities for candidate filtering, scoring, ranking, and reporting.
3. `uis/talent-pipeline-tracker`: internal People and Talent web interface for managing candidate pipeline operations.

## Project objective

Deliver a coherent talent operations platform with:
1. A conversion-focused public entry point (landing page + talent registration form).
2. Reliable domain logic for candidate/vacancy processing in reusable TypeScript utilities.
3. An operational internal tracker UI connected to the candidate API for day-to-day recruiting work.

## Problem being solved

Nexova has high candidate volume and historically manual workflows. The product initiative solves three linked problems:
1. Public channel problem: legacy website did not reflect positioning and did not capture structured candidate data.
2. Processing problem: consultants need deterministic, typed utilities to evaluate and rank candidates against vacancies.
3. Operations problem: People team needs a fast internal interface to list, filter, inspect, update, and annotate candidates without spreadsheet-driven overhead.

## Stakeholders and users

1. Marketing and Communications: owns public brand presentation and lead capture.
2. Operations and People team: uses tracker daily for candidate lifecycle decisions.
3. AI/Engineering team: implements and maintains logic, integration, and UI reliability.

## Success criteria

1. Public pages are context-accurate for Nexova and include validated candidate intake.
2. Domain utilities cover required data operations with explicit typing and predictable behavior.
3. Internal tracker supports end-to-end candidate management flows with visible loading and error feedback.
4. Folder-level implementations remain aligned with company context and milestone constraints.
