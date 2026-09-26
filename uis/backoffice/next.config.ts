import type { NextConfig } from "next";

// The browser only talks to the backoffice; Next.js proxies API calls to the
// FastAPI service. This avoids CORS and works behind port forwarding (Codespaces).
const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/incidents/:path*", destination: `${API_INTERNAL_URL}/api/incidents/:path*` }];
  },
};
export default nextConfig;
