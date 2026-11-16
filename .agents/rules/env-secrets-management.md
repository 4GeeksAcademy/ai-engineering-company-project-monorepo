# Rule: Environment Variables and Secrets Management

> Based on `CONTEXT.md`, root `README.md`, and `infra/README.md`.

**Scope:** 🔁 Always active — applies whenever writing code that uses API keys, database credentials, tokens, or any sensitive configuration value.

## Principle

TrackFlow integrates with 8 external carrier APIs (UPS, FedEx, DHL, MRW, SEUR,
etc.) and connects to databases in two different cloud providers. Every API
key, database credential, and sensitive configuration must be managed through
environment variables, never hardcoded.

## Mandatory rules

1. **No hardcoded secrets** — API keys, database URLs, passwords, and any
   sensitive credential must never appear in source code, documentation, or
   commit messages.

2. **Use a `.env` file for local development** — Place a `.env` file in the
   repository root (it must be listed in `.gitignore`). Use a `.env.example`
   file (committed) to document which variables are needed, with placeholder
   values.

3. **Prefix environment variables** — Use the pattern `TRACKFLOW_<COMPONENT>_<KEY>`
   for consistency, e.g.:
   - `TRACKFLOW_CARRIER_UPS_API_KEY`
   - `TRACKFLOW_CARRIER_FEDEX_API_KEY`
   - `TRACKFLOW_DB_LA_HOST`
   - `TRACKFLOW_DB_ZARAGOZA_HOST`

4. **Document every variable in `.env.example`** — Include a short description
   of each variable, whether it is required or optional, and an example value.

5. **Infrastructure secrets** — For production, manage secrets through the
   infrastructure tooling defined in `infra/` (e.g. Docker secrets, cloud vault,
   CI/CD variables), not through `.env` files.

## References

- `CONTEXT.md` — 8 carrier integrations, 2 cloud database providers
- Root `README.md` — `docker-compose.yml` for local orchestration
- `infra/README.md` — infrastructure and deployment centralization