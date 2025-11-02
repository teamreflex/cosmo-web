import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import prettierConfig from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  prettierConfig,
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/triple-slash-reference": "off",
      "@typescript-eslint/consistent-type-exports": [
        "warn",
        {
          fixMixedExportsWithInlineTypeSpecifier: true,
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        {
          fixStyle: "inline-type-imports",
          prefer: "type-imports",
        },
      ],
      "@typescript-eslint/no-import-type-side-effects": "warn",
      // prevent type definitions from being flagged as unused
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "none",
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
      // allow namespaces, will break nodejs strip types
      "@typescript-eslint/no-namespace": "off",
      // allow types like `type T extends {} = {}`
      "@typescript-eslint/no-empty-object-type": "off",
      // allow var instead of enforcing let/const
      "no-var": "off",
    },
  }
);
