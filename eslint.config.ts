import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "typescript-eslint";
// @ts-ignore - no types
import { tanstackConfig } from "@tanstack/eslint-config";
import tanstackQuery from "@tanstack/eslint-plugin-query";
import tanstackRouter from "@tanstack/eslint-plugin-router";

// create compatibility layer between new flat config and legacy config system
const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default defineConfig(
  {
    ignores: [
      "node_modules",
      ".output",
      "dist",
      ".tanstack",
      ".vercel",
      "src/routeTree.gen.ts",
      "src/i18n/**/*.js",
    ],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  tanstackConfig,
  ...tanstackQuery.configs["flat/recommended"],
  ...tanstackRouter.configs["flat/recommended"],
  ...compat.plugins("eslint-plugin-react-compiler"),
  ...compat.plugins("eslint-plugin-react-google-translate"),
  {
    extends: [compat.extends("plugin:drizzle/all")],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/triple-slash-reference": "off",
      "@typescript-eslint/consistent-type-exports": [
        "warn",
        {
          fixMixedExportsWithInlineTypeSpecifier: true,
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        {
          fixStyle: "inline-type-imports",
          prefer: "type-imports",
        },
      ],
      "@typescript-eslint/no-import-type-side-effects": "warn",
      // prevent type definitions from being flagged as unused
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "none",
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
      // allow namespaces, will break nodejs strip types
      "@typescript-eslint/no-namespace": "off",
      // allow types like `type T extends {} = {}`
      "@typescript-eslint/no-empty-object-type": "off",
      // allow var instead of enforcing let/const
      "no-var": "off",
      // prevents accidental mass-deletion
      "drizzle/enforce-delete-with-where": [
        "error",
        {
          drizzleObjectName: ["db", "indexer"],
        },
      ],
      // prevents accidental mass-update
      "drizzle/enforce-update-with-where": [
        "error",
        {
          drizzleObjectName: ["db", "indexer"],
        },
      ],
      // trigger errors when breaking react compiler best practices
      "react-compiler/react-compiler": "error",
      // trigger errors when doing things that may cause react to break
      "react-google-translate/no-conditional-text-nodes-with-siblings": "error",
      "react-google-translate/no-return-text-nodes": "error",
    },
  },
);
