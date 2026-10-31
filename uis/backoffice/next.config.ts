import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  outputFileTracingRoot: path.join(__dirname, "../.."),
  turbopack: {},
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@trackflow-content": path.resolve(
        __dirname,
        "../../src/trackflow-website/content",
      ),
      "@trackflow-components": path.resolve(
        __dirname,
        "../../src/components",
      ),
    };

    return config;
  },
  // ------------------------------------------------------------------
  // Server-side reverse proxy to the TrackFlow API.
  //
  // The backoffice is a client-side SPA that calls the API with a
  // relative /api, /auth, /users, /profiles, /inventory, /suppliers
  // prefix. These rewrites forward that traffic to the backend over
  // the Docker network using the COMPOSE SERVICE NAME (`api`), never
  // localhost — fulfilling the infra requirement that inter-service
  // URLs use the service name.
  //
  // /inventory and /suppliers overlap with Next.js page routes, so they
  // are handled separately by middleware.ts (which only proxies
  // API-shaped requests, e.g. when an Authorization header is present).
  // ------------------------------------------------------------------
  async rewrites() {
    const upstream = process.env.BACKEND_UPSTREAM ?? "http://localhost:8000";
    return [
      { source: "/api/:path*", destination: `${upstream}/api/:path*` },
      { source: "/auth/:path*", destination: `${upstream}/auth/:path*` },
      { source: "/users/:path*", destination: `${upstream}/users/:path*` },
      { source: "/profiles/:path*", destination: `${upstream}/profiles/:path*` },
    ];
  },
};

export default nextConfig;
