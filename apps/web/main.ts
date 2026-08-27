/**
 * PORT (number)
 *   - Server port number
 *   - Default: 3000
 *
 * Note: Static assets are served as Bun file routes (ETag, 304 and Range
 * handling built in). Cloudflare caches and compresses all responses, Vite
 * hashes filenames.
 */

import * as Sentry from "@sentry/bun";
import path from "node:path";

// Configuration
const parsedPort = Number(process.env.PORT ?? 3000);
const SERVER_PORT =
  Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535
    ? parsedPort
    : 3000;
const CLIENT_DIRECTORY = path.join(import.meta.dir, "./dist/client");
const SERVER_ENTRY_POINT = path.join(
  import.meta.dir,
  "./dist/server/server.js",
);

// Logging utilities
const log = {
  info: (message: string) => console.info(`[INFO] ${message}`),
  success: (message: string) => console.log(`[SUCCESS] ${message}`),
  warning: (message: string) => console.warn(`[WARNING] ${message}`),
  error: (message: string) => console.error(`[ERROR] ${message}`),
};

/**
 * Build the Content-Security-Policy header value from known origins.
 */
function buildContentSecurityPolicy(): string {
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    // cloudflare web analytics beacon, injected by the proxy
    "https://static.cloudflareinsights.com",
  ];
  const connectSrc = ["'self'", "https://cloudflareinsights.com"];
  const imgSrc = [
    "'self'",
    "data:",
    "blob:",
    // objekt images
    "https://imagedelivery.net",
    "https://a6056a84169c4302bbb29edd133b91f1.cosmo.fans",
    // cosmo assets - artist/member images
    "https://static.cosmo.fans",
    // band images
    "https://resources.cosmo.fans",
    // apollo assets - MCO videos, era/event images
    "https://cdn.apollo.cafe",
    // spotify images
    "https://i.scdn.co",
  ];

  const umamiUrl = process.env.VITE_UMAMI_SCRIPT_URL;
  if (umamiUrl) {
    try {
      const origin = new URL(umamiUrl).origin;
      scriptSrc.push(origin);
      connectSrc.push(origin);
    } catch {
      log.warning("VITE_UMAMI_SCRIPT_URL is not a valid URL, omitted from CSP");
    }
  }

  const sentryDsn = process.env.VITE_SENTRY_DSN;
  if (sentryDsn) {
    try {
      connectSrc.push(new URL(sentryDsn).origin);
    } catch {
      log.warning("VITE_SENTRY_DSN is not a valid URL, omitted from CSP");
    }
  }

  const typesenseUrl = process.env.VITE_TYPESENSE_URL;
  if (typesenseUrl) {
    try {
      connectSrc.push(new URL(typesenseUrl).origin);
    } catch {
      log.warning("VITE_TYPESENSE_URL is not a valid URL, omitted from CSP");
    }
  }

  const r2AccountId = process.env.R2_ACCOUNT_ID;
  if (r2AccountId) {
    connectSrc.push(`${r2AccountId}.r2.cloudflarestorage.com`);
  }

  const r2Domain = process.env.R2_DOMAIN;
  if (r2Domain) {
    imgSrc.push(r2Domain);
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSrc.join(" ")}`,
    "media-src 'self' https://cdn.apollo.cafe blob:",
    "font-src 'self'",
    `connect-src ${connectSrc.join(" ")}`,
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

const CONTENT_SECURITY_POLICY = buildContentSecurityPolicy();

/**
 * Add basic security headers to response
 */
function addSecurityHeaders(headers: Headers): void {
  headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

/**
 * Scan client directory and build static routes.
 * File routes (a Response with a BunFile body) get Content-Type, ETag,
 * Last-Modified, 304 and Range handling from Bun; compression is left to Cloudflare.
 */
async function buildStaticRoutes(
  clientDirectory: string,
): Promise<Record<string, Response>> {
  // Vite's hashed output lives under assets/; everything else (copied from
  // public/) keeps its filename across deploys, so revalidate via ETag/304.
  const immutableHeaders = new Headers({
    "Cache-Control": "public, max-age=31536000, immutable",
  });
  addSecurityHeaders(immutableHeaders);

  const publicHeaders = new Headers({
    "Cache-Control": "public, max-age=3600",
  });
  addSecurityHeaders(publicHeaders);

  const routes: Record<string, Response> = {};
  const glob = new Bun.Glob("**/*");

  let count = 0;
  for await (const relativePath of glob.scan({ cwd: clientDirectory })) {
    const filepath = path.join(clientDirectory, relativePath);
    const file = Bun.file(filepath);

    // Skip directories and empty files
    if (!(await file.exists()) || file.size === 0) continue;

    const posixPath = relativePath.split(path.sep).join(path.posix.sep);
    const headers = posixPath.startsWith("assets/")
      ? immutableHeaders
      : publicHeaders;
    routes[`/${posixPath}`] = new Response(file, { headers });
    count++;
  }

  log.success(`Registered ${count} static asset routes`);
  return routes;
}

/**
 * Default dynamic responses to no-cache when the app didn't set a policy,
 * so Cloudflare doesn't apply its default edge/browser TTLs (e.g. caching
 * asset 404s for 4 hours in user browsers).
 */
function ensureCacheControl(headers: Headers): void {
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", "no-cache");
  }
}

type FetchHandler = {
  fetch: (request: Request) => Response | Promise<Response>;
};

/**
 * Initialize the server
 */
async function initializeServer() {
  // Load TanStack Start server handler
  let handler: FetchHandler;
  try {
    // SAFETY: the built server entry default-exports a fetch handler
    const serverModule = (await import(SERVER_ENTRY_POINT)) as {
      default: FetchHandler;
    };
    handler = serverModule.default;
    log.success("TanStack Start handler initialized");
  } catch (error) {
    log.error(`Failed to load server handler: ${String(error)}`);
    process.exit(1);
  }

  // Build static routes
  const staticRoutes = await buildStaticRoutes(CLIENT_DIRECTORY);

  // Create server
  const server = Bun.serve({
    port: SERVER_PORT,

    // keep connections alive for 2 minutes
    idleTimeout: 120,

    routes: {
      // Health check
      "/health": () => {
        const headers = new Headers({
          "Content-Type": "application/json",
        });
        addSecurityHeaders(headers);

        return new Response(JSON.stringify({ status: "healthy" }), {
          status: 200,
          headers,
        });
      },

      // Static assets
      ...staticRoutes,

      // Fallback to TanStack Start
      "/*": async (req: Request) => {
        try {
          const start = performance.now();
          const response = await handler.fetch(req);
          const end = performance.now() - start;

          const headers = new Headers(response.headers);
          headers.set("Server-Timing", `handler;dur=${end.toFixed(1)}`);
          addSecurityHeaders(headers);
          ensureCacheControl(headers);
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          });
        } catch (error) {
          Sentry.captureException(error);
          log.error(`Handler error: ${String(error)}`);
          const headers = new Headers({
            "Content-Type": "text/plain",
            "Cache-Control": "no-store",
          });
          addSecurityHeaders(headers);
          return new Response("Internal Server Error", {
            status: 500,
            headers,
          });
        }
      },
    },

    error(error) {
      Sentry.captureException(error);
      log.error(`Server error: ${error.message}`);
      const headers = new Headers({
        "Content-Type": "text/plain",
        "Cache-Control": "no-store",
      });
      addSecurityHeaders(headers);
      return new Response("Internal Server Error", { status: 500, headers });
    },
  });

  log.success(`Server listening on http://localhost:${server.port}`);
  return server;
}

// Start server
initializeServer()
  .then((server) => {
    const shutdown = async (signal: string) => {
      log.info(`Received ${signal}, shutting down...`);
      await server.stop();
      process.exit(0);
    };

    process.on("SIGTERM", () => void shutdown("SIGTERM"));
    process.on("SIGINT", () => void shutdown("SIGINT"));
  })
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- rejection values are genuinely unknown
  .catch((error: unknown) => {
    log.error(`Failed to start: ${String(error)}`);
    process.exit(1);
  });
