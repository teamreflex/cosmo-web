import eslint from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "typescript-eslint";

// create compatibility layer between new flat config and legacy config system
const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default tseslint.config(
  {
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    files: ["**/*.ts", "**/*.tsx"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      compat.extends("plugin:drizzle/all", "next"),
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
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
      // prevents accidental mass-deletion
      "drizzle/enforce-delete-with-where": [
        "error",
        {
          drizzleObjectName: ["db", "indexer"],
        },
      ],
      // prevents accidental mass-update
      "drizzle/enforce-update-with-where": [
        "error",
        {
          drizzleObjectName: ["db", "indexer"],
        },
      ],
      // trigger errors when breaking react compiler best practices
      "react-compiler/react-compiler": "error",
      // trigger errors when doing things that may cause react to break
      "react-google-translate/no-conditional-text-nodes-with-siblings": "error",
      "react-google-translate/no-return-text-nodes": "error",
    },
  },
  // load plugins from old config format
  ...compat.plugins("eslint-plugin-react-compiler"),
  ...compat.plugins("eslint-plugin-react-google-translate")
);
