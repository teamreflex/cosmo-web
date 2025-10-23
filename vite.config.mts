import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

const config = defineConfig(async () => {
  await import("./src/lib/env/server");
  await import("./src/lib/env/client");

  return {
    server: {
      port: 3000,
    },
    plugins: [
      viteTsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
      tanstackStart(),
      nitro({
        config: {
          compatibilityDate: "2025-10-19",
          preset: "vercel",
        },
      }),
      react({
        babel: {
          plugins: ["babel-plugin-react-compiler"],
        },
      }),
      tailwindcss(),
    ],
  };
});

export default config;
