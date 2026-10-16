# `uis` folder

This folder contains **all user-facing interfaces** for TrackFlow's monorepo.

TrackFlow is a logistics company operating in the United States and Spain. UI projects in this folder must reflect that domain (inventory visibility, carrier operations, returns, support, and executive reporting), not generic demo use cases.

## Applications in this folder

### `website`

Public-facing TrackFlow website with company narrative, service lines, operating footprint, and logistics value proposition from `CONTEXT.md`.

- Tech: Next.js App Router (JavaScript)
- Local run:
	- `cd uis/website`
	- `npm install`
	- `npm run dev`

### `backoffice`

Internal TrackFlow operations view with logistics-focused planning content and a simple dispatch planning panel (carrier + ETA recommendation logic) visible directly on `/`.

- Tech: Next.js App Router (JavaScript)
- Local run:
	- `cd uis/backoffice`
	- `npm install`
	- `npm run dev`

### `talent-pipeline-tracker`

Legacy/internal example app from earlier work. It is currently hiring-domain oriented and not the target TrackFlow logistics product direction.

## Conventions

- Keep each app in its own folder with a dedicated README.
- Keep public experiences in `uis/website` and internal operations experiences in `uis/backoffice`.
- If an interface requires backend data or background processing, place those services under `/services` following `services/README.md`.

## Notes

- UI work should stay aligned to TrackFlow's real departments and pain points from `CONTEXT.md`.
- Avoid creating duplicate frontend roots outside `uis/`.

> _Estas instrucciones también están disponibles en [español](./README.es.md)._
