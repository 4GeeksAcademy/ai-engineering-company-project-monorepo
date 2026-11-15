import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  distDir: process.env.PLAYWRIGHT_TEST === "1" ? ".next-e2e" : ".next",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
