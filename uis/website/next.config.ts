import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      }
    ]
  },
  async rewrites() {
    return [
      {
        source: "/backend-api/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
      {
        source: "/auth/:path*",
        destination: `${BACKEND_URL}/auth/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
      {
        source: "/suppliers/:path*",
        destination: `${BACKEND_URL}/suppliers/:path*`,
      },
      {
        source: "/users/:path*",
        destination: `${BACKEND_URL}/users/:path*`,
      },
      {
        source: "/profiles/:path*",
        destination: `${BACKEND_URL}/profiles/:path*`,
      },
    ];
  },
};

export default nextConfig;
