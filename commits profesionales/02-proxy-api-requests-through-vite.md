Proxy API requests through Vite so the backoffice works in Codespaces

The backoffice called http://localhost:8000 straight from the browser.
In GitHub Codespaces "localhost" resolves to the user's machine, not the
container, so uploads failed with ERR_CONNECTION_REFUSED.

- Default API_BASE_URL to same-origin and proxy /api to localhost:8000
  in vite.config.ts (no CORS or port-8000 forwarding needed)
- Keep VITE_API_BASE_URL as an optional override
- Update .env.example and the backoffice README accordingly
