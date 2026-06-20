import baseConfig from "@apollo/lint/oxlint.config";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [baseConfig],
  plugins: ["typescript", "react", "import", "unicorn"],
  jsPlugins: [
    "eslint-plugin-drizzle",
    "@tanstack/eslint-plugin-query",
    "@tanstack/eslint-plugin-router",
  ],
  ignorePatterns: [
    "node_modules",
    ".turbo",
    ".output",
    "dist",
    ".nitro",
    ".tanstack",
    ".vercel",
    "src/routeTree.gen.ts",
    "src/i18n/**/*.js",
  ],
  rules: {
    "drizzle/enforce-delete-with-where": [
      "error",
      {
        drizzleObjectName: ["db", "indexer"],
      },
    ],
    "drizzle/enforce-update-with-where": [
      "error",
      {
        drizzleObjectName: ["db", "indexer"],
      },
    ],
    "react/only-export-components": [
      "error",
      {
        // allows tanstack router/start routes through
        customHOCs: [
          "createFileRoute",
          "createLazyFileRoute",
          "createRootRoute",
          "createRootRouteWithContext",
          "createLink",
          "createRoute",
          "createLazyRoute",
        ],
      },
    ],
    "react/react-compiler": "error",
    "@tanstack/query/exhaustive-deps": "error",
  },
});
