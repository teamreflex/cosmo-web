import baseConfig from "@apollo/eslint/base";
import { defineConfig } from "eslint/config";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";

const baseDirectory = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  {
    ignores: ["node_modules", ".turbo"],
  },
  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: baseDirectory,
      },
    },
  },
  baseConfig,
);
