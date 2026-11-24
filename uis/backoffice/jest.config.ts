import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  transform: {
    // The app compiles with module "esnext"/"bundler" (Next.js); Jest needs CommonJS.
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { module: "commonjs", target: "es2020", esModuleInterop: true } }],
  },
  collectCoverageFrom: ["src/lib/auth.ts", "src/lib/apiClient.ts", "src/lib/authApi.ts", "src/lib/errors.ts", "src/lib/inventory.ts", "src/lib/telemetry.ts", "src/lib/inventoryTelemetry.ts", "src/lib/errorTelemetry.ts"],
  coverageDirectory: "coverage",
};

export default config;
