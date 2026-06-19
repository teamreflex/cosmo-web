import baseConfig from "@apollo/lint/oxfmt.config";
import { defineConfig } from "oxfmt";

export default defineConfig({
  ...baseConfig,
  sortTailwindcss: {
    stylesheet: "./src/styles/tailwind.css",
    functions: ["cn", "clsx"],
  },
});
