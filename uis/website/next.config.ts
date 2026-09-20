import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/backend-api/:path*",
        destination: "http://backend:8000/:path*",
      },
      {
        source: "/auth/:path*",
        destination: "http://backend:8000/auth/:path*",
      },
      {
        source: "/api/:path*",
        destination: "http://backend:8000/api/:path*",
      },
      {
        source: "/suppliers/:path*",
        destination: "http://backend:8000/suppliers/:path*",
      },
      {
        source: "/users/:path*",
        destination: "http://backend:8000/users/:path*",
      },
      {
        source: "/profiles/:path*",
        destination: "http://backend:8000/profiles/:path*",
      },
    ];
  },
};

export default nextConfig;
