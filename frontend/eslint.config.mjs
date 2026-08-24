import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "debug-firebase-config.js",
    "playwright/**",
  ]),
  // Project-level rule overrides
  {
    rules: {
      // react-compiler plugin is not installed — suppress the "rule not found" error
      'react-compiler/react-compiler': 'off',
      // Allow underscore-prefixed variables to be unused (common convention)
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // setState in effects is acceptable when clearing derived UI state (e.g. tab switches)
      'react-hooks/set-state-in-effect': 'warn',
      // react-hook-form's watch() is a known incompatibility with React Compiler — acceptable
      'react-hooks/incompatible-library': 'warn',
    },
  },
]);

export default eslintConfig;
