import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { FontaineTransform } from "fontaine";
import { createRequire } from "node:module";
import { defineConfig } from "vite";
import "./src/lib/env/client.ts";
import "./src/lib/env/server.ts";

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
  environments: {
    client: {
      build: {
        rolldownOptions: {
          output: {
            codeSplitting: {
              // split vendor and shared app code out into two separate chunks
              groups: [
                {
                  name: "vendor",
                  tags: ["$initial"],
                  test: (id) =>
                    /[\\/]node_modules[\\/]/.test(id) &&
                    !/[\\/]@sentry[\\/]/.test(id) &&
                    !/[\\/]@tanstack[\\/](react-)?start(-client)?(-core)?[\\/]/.test(
                      id,
                    ),
                  includeDependenciesRecursively: false,
                  priority: 2,
                },
                {
                  name: "app",
                  tags: ["$initial"],
                  test: (id) => !/[\\/]@sentry[\\/]/.test(id),
                  includeDependenciesRecursively: false,
                  priority: 1,
                },
              ],
            },
          },
        },
      },
    },
  },
  ssr: {
    external: ["bun"],
  },
  optimizeDeps: {
    exclude: ["bun"],
  },
  plugins: [
    devtools({
      removeDevtoolsOnBuild: true,
    }),
    tanstackStart({
      importProtection: {
        // writes to R2 with Bun APIs; only reachable through lib/server
        client: { specifiers: ["@apollo/image/server"] },
      },
    }),
    /**
     * Generates metric-matched local fallbacks for each @font-face, so text doesn't reflow when the webfont swaps in.
     * It only rewrites `font-family` declarations, so the `--font-*` theme variables list the fallbacks themselves.
     */
    FontaineTransform.vite({
      // fontaine can't detect JetBrains Mono as monospace from the file, so it would get sans-serif fallbacks
      fallbacks: { "JetBrains Mono Variable": ["Courier New"] },
      // hand-tuned in tailwind.css
      skipFontFaceGeneration: (name) => name === "HalvarBreitBd fallback",
      // fontaine resolves `src` URLs against the stylesheet, so the @fontsource package specifiers need resolving here
      resolvePath: (source) => createRequire(import.meta.url).resolve(source),
    }),
    tailwindcss(),
    react({
      compiler: true,
    }),
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
