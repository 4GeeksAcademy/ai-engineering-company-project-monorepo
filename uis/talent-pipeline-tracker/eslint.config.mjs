import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { FlatCompat } from "@eslint/eslintrc";
import { defineConfig, globalIgnores } from "eslint/config";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

export default defineConfig([
  ...compat.extends("next/core-web-vitals"),
  globalIgnores([".next/**", "out/**", "build/**", "uis/**", "next-env.d.ts"]),
]);
