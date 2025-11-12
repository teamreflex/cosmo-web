import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { paraglideVitePlugin } from "@inlang/paraglide-js";

const config = defineConfig(async () => {
  await import("./src/lib/env/client");
  await import("./src/lib/env/server");

  return {
    server: {
      port: 3000,
    },
    plugins: [
      devtools({
        removeDevtoolsOnBuild: true,
      }),
      viteTsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
      tanstackStart(),
      nitro({
        config: {
          compatibilityDate: "2025-11-11",
          preset: "bun",
        },
      }),
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
  };
});

export default config;
