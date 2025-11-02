import baseConfig from "@apollo/eslint/base";
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
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
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
  baseConfig,
);
