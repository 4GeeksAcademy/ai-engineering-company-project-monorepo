import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The monorepo has several lockfiles, so pin the root to this app.
  turbopack: {
    root: path.join(__dirname),
  },
  // Keep browser requests same-origin; Next.js forwards them to the API.
  async rewrites() {
    return [
      {
        source: "/api/suppliers",
        destination: `${process.env.API_SERVER_URL ?? "http://127.0.0.1:8000"}/suppliers`,
      },
      {
        source: "/api/suppliers/:path*",
        destination: `${process.env.API_SERVER_URL ?? "http://127.0.0.1:8000"}/suppliers/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${process.env.API_SERVER_URL ?? "http://127.0.0.1:8000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
