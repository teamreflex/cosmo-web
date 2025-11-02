import baseConfig from "@apollo/eslint/base";
import tsParser from "@typescript-eslint/parser";

export default [
  // ignore patterns for apps and packages directories
  {
    ignores: ["apps/**", "packages/**"],
  },
  // base configuration
  {
    ...baseConfig,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: true,
      },
    },
  },
];