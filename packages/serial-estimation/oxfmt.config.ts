import baseConfig from "@apollo/lint/oxfmt.config";
import { defineConfig } from "oxfmt";

export default defineConfig({
  ...baseConfig,
  ignorePatterns: ["tests/fixtures"],
});
