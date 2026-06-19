import { defineConfig } from "oxfmt";

export default defineConfig({
  printWidth: 80,
  trailingComma: "all",
  sortPackageJson: false,
  sortImports: {
    groups: [
      ["builtin", "external"],
      ["internal"],
      ["parent", "sibling", "index"],
    ],
    internalPattern: ["@/**", "@apollo/**"],
    newlinesBetween: false,
  },
});
