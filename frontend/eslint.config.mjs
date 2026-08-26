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
  // Project-level rule overrides.
  //
  // `files` is not optional here. eslint-config-next declares the `react`,
  // `react-hooks`, `import` and `jsx-a11y` plugins on a config object scoped to
  // `**/*.{js,jsx,mjs,ts,tsx,mts,cts}` — note the absence of `cjs`. An unscoped
  // object applies to every linted file, so switching a `react-hooks/*` rule
  // below made ESLint resolve that rule for plain `.cjs` node scripts too, where
  // the plugin was never defined, and the whole run aborted with
  // "could not find plugin react-hooks". Matching next's glob keeps these
  // overrides on exactly the files whose plugins are in scope.
  {
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
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
  // Repo tooling (e.g. scripts/audit-keyframes.cjs) runs directly under node
  // rather than through the bundler, so CommonJS `require` is the correct form.
  {
    files: ["**/*.cjs"],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);

export default eslintConfig;
