import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["typescript", "react", "import", "unicorn"],
  env: {
    builtin_globals: true,
  },
  settings: {
    typescript: {
      type_aware: {
        enabled: true,
      },
    },
  },
  rules: {
    "no-unused-vars": "off",
    "no-var": "off",
    "typescript/array-type": "off",
    "typescript/triple-slash-reference": "off",
    "typescript/no-namespace": "off",
    "typescript/no-empty-object-type": "off",
    "typescript/no-unused-vars": [
      "error",
      {
        args: "none",
        varsIgnorePattern: "^_",
        argsIgnorePattern: "^_",
        caughtErrors: "none",
      },
    ],
    "typescript/consistent-type-imports": [
      "warn",
      {
        fixStyle: "inline-type-imports",
        prefer: "type-imports",
      },
    ],
    "typescript/consistent-type-exports": [
      "warn",
      {
        fixMixedExportsWithInlineTypeSpecifier: true,
      },
    ],
    "typescript/no-import-type-side-effects": "warn",
    "typescript/await-thenable": "error",
    "typescript/no-floating-promises": "warn",
    "typescript/no-misused-promises": "off",
    "typescript/restrict-template-expressions": "warn",
    "typescript/no-base-to-string": "warn",
    "unicorn/no-useless-spread": "warn",
  },
  ignorePatterns: ["node_modules", ".turbo", "dist", "*.gen.ts"],
});
