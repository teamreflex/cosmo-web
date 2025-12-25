import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import tsConfigPaths from "vite-tsconfig-paths";

import "./src/lib/env/client";
import "./src/lib/env/server";

export default defineConfig({
  server: {
    port: 3000,
  },
  ssr: {
    external: ["bun"],
  },
  plugins: [
    devtools({
      removeDevtoolsOnBuild: true,
    }),
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart(),
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/i18n",
      outputStructure: "message-modules",
      cookieName: "PARAGLIDE_LOCALE",
      strategy: ["cookie", "preferredLanguage", "baseLocale"],
    }),
    tailwindcss(),
  ],
});
