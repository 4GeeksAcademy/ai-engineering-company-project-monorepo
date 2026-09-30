import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The monorepo has several lockfiles, so pin the root to this app.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
