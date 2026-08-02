import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/shared-types"],
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
