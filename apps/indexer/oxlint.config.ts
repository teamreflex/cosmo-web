import baseConfig from "@apollo/lint/oxlint.config";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [baseConfig],
  ignorePatterns: [
    "node_modules",
    ".turbo",
    "lib",
    "src/model/generated/**",
    "src/abi/**",
    "db/migrations/**",
  ],
});
