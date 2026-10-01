import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // The talent pipeline tracker is a separate app with its own lint config.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "talent-pipeline-tracker/**"]),
]);

export default eslintConfig;
