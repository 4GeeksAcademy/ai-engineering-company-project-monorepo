import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@trackflow/logic"],
  async rewrites() {
    return [
      {
        source: "/suppliers/:path*",
        destination: "http://localhost:8004/suppliers/:path*",
      },
      {
        source: "/auth/:path*",
        destination: "http://localhost:8004/auth/:path*",
      },
      {
        source: "/users/:path*",
        destination: "http://localhost:8004/users/:path*",
      },
      {
        source: "/profiles/:path*",
        destination: "http://localhost:8004/profiles/:path*",
      },
      {
        source: "/api/incidents/:path*",
        destination: "http://localhost:8004/api/incidents/:path*",
      },
      {
        source: "/telemetry/:path*",
        destination: "http://localhost:8004/telemetry/:path*",
      },
    ];
  },
};

export default nextConfig;
