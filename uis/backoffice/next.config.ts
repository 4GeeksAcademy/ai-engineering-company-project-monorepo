import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@trackflow/logic"],
  async rewrites() {
    return [
      {
        source: "/suppliers/:path*",
        destination: "http://localhost:8000/suppliers/:path*",
      },
    ];
  },
};

export default nextConfig;
