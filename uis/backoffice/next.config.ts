import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(appRoot, "../..");

const nextConfig: NextConfig = {
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;
