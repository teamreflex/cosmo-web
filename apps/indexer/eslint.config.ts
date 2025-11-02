import baseConfig from "@apollo/eslint/base";
import { defineConfig } from "eslint/config";

export default defineConfig(
  {
    ignores: ["node_modules", "lib"],
  },
  baseConfig,
);
