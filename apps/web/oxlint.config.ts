import baseConfig from "@apollo/lint/oxlint.config";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [baseConfig],
  plugins: ["typescript", "react", "import", "unicorn"],
  jsPlugins: [
    "eslint-plugin-drizzle",
    "@tanstack/eslint-plugin-query",
    "@tanstack/eslint-plugin-router",
  ],
  ignorePatterns: [
    "node_modules",
    ".turbo",
    ".output",
    "dist",
    ".nitro",
    ".tanstack",
    ".vercel",
    "src/routeTree.gen.ts",
    "src/i18n/**/*.js",
  ],
  rules: {
    "drizzle/enforce-delete-with-where": [
      "error",
      {
        drizzleObjectName: ["db", "indexer"],
      },
    ],
    "drizzle/enforce-update-with-where": [
      "error",
      {
        drizzleObjectName: ["db", "indexer"],
      },
    ],
    "react/only-export-components": [
      "error",
      {
        // allows tanstack router/start routes through
        customHOCs: [
          "createFileRoute",
          "createLazyFileRoute",
          "createRootRoute",
          "createRootRouteWithContext",
          "createLink",
          "createRoute",
          "createLazyRoute",
        ],
      },
    ],
    "react/react-compiler": "error",
    "@tanstack/query/exhaustive-deps": "error",
  },
  overrides: [
    // vendored shadcn/ui components track upstream; don't hold them to anti-slop rules
    {
      files: ["src/components/ui/**"],
      rules: {
        "anti-slop/no-chained-type-assertions": "off",
        "anti-slop/no-conditional-empty-object-spread": "off",
        "anti-slop/no-known-value-widening": "off",
        "anti-slop/no-module-mocking": "off",
        "anti-slop/no-object-parameters": "off",
        "anti-slop/no-reflect-apply": "off",
        "anti-slop/no-reflect-get": "off",
        "anti-slop/no-runtime-typeof": "off",
        "anti-slop/no-shape-in-symbol-names": "off",
        "anti-slop/no-unknown-parameters": "off",
        "anti-slop/no-unknown-returns": "off",
        "anti-slop/no-unknown-type-aliases": "off",
        "anti-slop/no-unsafe-dictionary-type": "off",
        "anti-slop/no-widen-then-assert": "off",
        "anti-slop/require-safety-comment-for-type-assertion": "off",
      },
    },
  ],
});
