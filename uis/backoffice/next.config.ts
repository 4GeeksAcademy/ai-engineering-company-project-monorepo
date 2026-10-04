import type { NextConfig } from "next";

const apiOrigin = process.env.API_ORIGIN ?? "http://127.0.0.1:43180";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async rewrites() {
    return [
      {
        source: "/api/suppliers",
        destination: `${apiOrigin}/suppliers`,
      },
      {
        source: "/api/suppliers/:path*",
        destination: `${apiOrigin}/suppliers/:path*`,
      },
    ];
  },
};

export default nextConfig;
