import nextJest from "next/jest.js";

// next/jest compiles TS/TSX with SWC (the same compiler as `next build`) and loads next.config.mjs.
const createJestConfig = nextJest({ dir: "./" });

export default createJestConfig({
  // jsdom by default (localStorage, window, StorageEvent, React components). Tests of the plain
  // API client opt into the node environment with a `@jest-environment node` docblock, because
  // jsdom does not provide fetch/Response.
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
  testMatch: ["<rootDir>/src/__tests__/**/*.test.{ts,tsx}"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  clearMocks: true,
  // The authentication client. Pages and the rest of the UI are covered by the Playwright e2e scripts.
  collectCoverageFrom: [
    "src/lib/token.ts",
    "src/lib/returnTo.ts",
    "src/lib/api.ts",
    "src/lib/errors.ts",
    "src/lib/profileFields.ts",
    "src/lib/signUpForm.ts",
    "src/auth/**/*.{ts,tsx}",
  ],
  coverageReporters: ["text", "html"],
  // `jest --coverage` fails if coverage drops under these. The ticket asks for at least 70 % on authentication; every
  // authentication module is held to 90 %. (Jest applies "global" only to files without a path rule, so there is none.)
  // api.ts mixes the authentication client with the incident and supplier clients, which this plan does not cover:
  // it gets a floor just under today's figures, so it cannot silently lose the authentication part's tests.
  coverageThreshold: {
    "./src/auth/": { statements: 90, branches: 90, functions: 90, lines: 90 },
    "./src/lib/token.ts": { statements: 90, branches: 90, functions: 90, lines: 90 },
    "./src/lib/returnTo.ts": { statements: 90, branches: 90, functions: 90, lines: 90 },
    "./src/lib/errors.ts": { statements: 90, branches: 90, functions: 90, lines: 90 },
    "./src/lib/profileFields.ts": { statements: 90, branches: 90, functions: 90, lines: 90 },
    "./src/lib/signUpForm.ts": { statements: 90, branches: 90, functions: 90, lines: 90 },
    "./src/lib/api.ts": { statements: 45, branches: 65, functions: 30, lines: 50 },
  },
});
