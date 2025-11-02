import baseConfig from "@apollo/eslint/base";
import * as effectPlugin from "@effect/eslint-plugin";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: ["node_modules", ".turbo", "build"],
  },
  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
  ...effectPlugin.configs.dprint,
  {
    rules: {
      "@effect/dprint": "off",
    },
  },
  baseConfig,
);
