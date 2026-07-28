import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@trackflow/logic"],
  async rewrites() {
    return [
      {
        source: "/suppliers/:path*",
        destination: "http://localhost:8000/suppliers/:path*",
      },
      {
        source: "/auth/:path*",
        destination: "http://localhost:8000/auth/:path*",
      },
      {
        source: "/users/:path*",
        destination: "http://localhost:8000/users/:path*",
      },
      {
        source: "/profiles/:path*",
        destination: "http://localhost:8000/profiles/:path*",
      },
    ];
  },
};

export default nextConfig;
