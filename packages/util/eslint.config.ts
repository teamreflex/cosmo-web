import baseConfig from "@apollo/eslint/base";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

declare const __dirname: string;

export default defineConfig(
  {
    ignores: ["node_modules", ".turbo"],
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
  baseConfig,
);
