import path from "node:path";
import type { NextConfig } from "next";

const apiServerUrl = process.env.API_SERVER_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  // The monorepo has several lockfiles, so pin the root to this app.
  turbopack: {
    root: path.join(__dirname),
  },
  // Keep browser requests same-origin; Next.js forwards them to the API.
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: `${apiServerUrl}/auth/:path*`,
      },
      {
        source: "/api/users/:path*",
        destination: `${apiServerUrl}/users/:path*`,
      },
      {
        source: "/api/users",
        destination: `${apiServerUrl}/users`,
      },
      {
        source: "/api/profiles/:path*",
        destination: `${apiServerUrl}/profiles/:path*`,
      },
      {
        source: "/api/suppliers",
        destination: `${apiServerUrl}/suppliers`,
      },
      {
        source: "/api/suppliers/:path*",
        destination: `${apiServerUrl}/suppliers/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${apiServerUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
