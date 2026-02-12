import baseConfig from "@apollo/lint/oxlint.config";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [baseConfig],
  jsPlugins: [
    "eslint-plugin-drizzle",
    "@tanstack/eslint-plugin-query",
    "@tanstack/eslint-plugin-router",
    "eslint-plugin-react-refresh",
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
    "react-refresh/only-export-components": [
      "error",
      {
        // allows tanstack router/start routes through
        extraHOCs: [
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
    "@tanstack/query/exhaustive-deps": "error",
  },
});
