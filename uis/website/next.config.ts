import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  outputFileTracingRoot: path.join(__dirname, "../.."),
  turbopack: {},
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@trackflow-content": path.resolve(
        __dirname,
        "../../src/trackflow-website/content",
      ),
    };

    return config;
  },
};

export default nextConfig;