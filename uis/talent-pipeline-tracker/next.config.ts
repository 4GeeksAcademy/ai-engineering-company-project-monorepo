import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    PROJECT_API_URL: process.env.PROJECT_API_URL,
  },
};

export default nextConfig;
