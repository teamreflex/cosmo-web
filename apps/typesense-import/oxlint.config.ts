import baseConfig from "@apollo/lint/oxlint.config";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [baseConfig],
  jsPlugins: ["@effect/eslint-plugin"],
  ignorePatterns: ["node_modules", ".turbo", "build", "dist"],
  rules: {
    "@effect/dprint": "off",
  },
});
