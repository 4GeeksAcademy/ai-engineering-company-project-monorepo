
import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  agentRules: false,

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
      {
        source: "/auth/:path*",
        destination: `${API_URL}/auth/:path*`,
      },
      {
        source: "/users/:path*",
        destination: `${API_URL}/users/:path*`,
      },
      {
        source: "/profiles/:path*",
        destination: `${API_URL}/profiles/:path*`,
      },
    ];
  },
};

export default nextConfig;
