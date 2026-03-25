import { paraglideVitePlugin } from "@inlang/paraglide-js";
import babel from "@rolldown/plugin-babel";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import "./src/lib/env/client";
import "./src/lib/env/server";

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    sourcemap: process.env.SENTRY_AUTH_TOKEN === undefined ? false : "hidden",
    // prevent rolldown outputting a massive file to stdout
    rolldownOptions: {
      checks: {
        commonJsVariableInEsm: false,
      },
    },
  },
  ssr: {
    external: ["bun"],
  },
  plugins: [
    tanstackStart(),
    devtools({
      removeDevtoolsOnBuild: true,
    }),
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/i18n",
      outputStructure: "message-modules",
      cookieName: "PARAGLIDE_LOCALE",
      strategy: ["cookie", "preferredLanguage", "baseLocale"],
    }),
    // must remain last
    sentryVitePlugin({
      disable: process.env.SENTRY_AUTH_TOKEN === undefined,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: {
        filesToDeleteAfterUpload: ["./dist/**/*.map"],
      },
      telemetry: false,
    }),
  ],
});
