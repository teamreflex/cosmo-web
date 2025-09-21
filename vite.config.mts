import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { wrapVinxiConfigWithSentry } from "@sentry/tanstackstart-react";

const config = defineConfig({
  plugins: [
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart({
      customViteReactPlugin: true,
    }),
    viteReact(),
  ],
});

export default config;
// export default wrapVinxiConfigWithSentry(config, {
//   org: import.meta.env.SENTRY_ORG,
//   project: import.meta.env.SENTRY_PROJECT,
//   authToken: import.meta.env.SENTRY_AUTH_TOKEN,
//   // Only print logs for uploading source maps in CI
//   // Set to `true` to suppress logs
//   silent: !import.meta.env.CI,
// });
