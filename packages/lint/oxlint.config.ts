import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["typescript", "import", "unicorn"],
  jsPlugins: [{ name: "anti-slop", specifier: "@apollo/lint/anti-slop" }],
  env: {
    builtin_globals: true,
  },
  rules: {
    "anti-slop/no-chained-type-assertions": "error",
    "anti-slop/no-conditional-empty-object-spread": "error",
    "anti-slop/no-known-value-widening": "error",
    "anti-slop/no-module-mocking": "error",
    "anti-slop/no-object-parameters": "error",
    "anti-slop/no-reflect-apply": "error",
    "anti-slop/no-reflect-get": "error",
    "anti-slop/no-runtime-typeof": "error",
    "anti-slop/no-shape-in-symbol-names": "error",
    "anti-slop/no-unknown-parameters": "error",
    "anti-slop/no-unknown-returns": "error",
    "anti-slop/no-unknown-type-aliases": "error",
    "anti-slop/no-unsafe-dictionary-type": "error",
    "anti-slop/no-widen-then-assert": "error",
    "anti-slop/require-safety-comment-for-type-assertion": "error",
    "no-unused-vars": "warn",
    "no-var": "off",
    "typescript/array-type": "off",
    "typescript/triple-slash-reference": "off",
    "typescript/no-namespace": "off",
    "typescript/no-empty-object-type": "off",
    "typescript/no-unused-vars": [
      "warn",
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
  ignorePatterns: [
    "node_modules",
    ".turbo",
    "dist",
    "*.gen.ts",
    "anti-slop/**",
  ],
});
