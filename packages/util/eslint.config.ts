import baseConfig from "@apollo/eslint/base";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: ["node_modules"],
  },
  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.ts"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  baseConfig,
);
