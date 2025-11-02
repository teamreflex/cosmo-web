import baseConfig from "@apollo/eslint/base";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

const baseDirectory = __dirname;

export default defineConfig(
  {
    ignores: [
      "node_modules",
      ".turbo",
      "lib",
      "src/model/generated/**",
      "db/migrations/**",
    ],
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
