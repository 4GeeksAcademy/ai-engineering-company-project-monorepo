// Next.js config for the backoffice.
//
// In development the API calls are same-origin and Next forwards them to the local API (no CORS, and in
// Codespaces only the backoffice port needs forwarding), like the Vite proxy used to. /api and /auth have no
// pages here, so they always go to the API. /users (sign-up) and /profiles (my profile) are forwarded only
// for API calls: a browser page load (Accept: text/html) is left to the app. /suppliers is also an API route,
// but the app calls it as /api/suppliers so it never clashes with the /suppliers page.
// API_PROXY_TARGET changes where they go; with NEXT_PUBLIC_API_BASE_URL set, the app calls the API directly.
const API = process.env.API_PROXY_TARGET ?? "http://localhost:8000";
const notAPage = [{ type: "header", key: "accept", value: ".*text/html.*" }];

// `next dev` only serves its dev assets (JS chunks, live reload) to localhost. In a GitHub Codespace the browser
// comes through the forwarded URL (<codespace>-5174.app.github.dev), which it would answer with 403, leaving the
// pages without JavaScript. Allow exactly this codespace's forwarded hostname; nothing changes elsewhere.
const { CODESPACE_NAME, GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN } = process.env;
const allowedDevOrigins =
  CODESPACE_NAME && GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
    ? [`${CODESPACE_NAME}-5174.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`]
    : [];

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins,
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API}/api/:path*` },
      { source: "/auth/:path*", destination: `${API}/auth/:path*` },
      { source: "/users", destination: `${API}/users`, missing: notAPage },
      { source: "/users/:path*", destination: `${API}/users/:path*`, missing: notAPage },
      { source: "/profiles/:path*", destination: `${API}/profiles/:path*`, missing: notAPage },
    ];
  },
};

export default nextConfig;
