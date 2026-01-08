/**
 * PORT (number)
 *   - Server port number
 *   - Default: 3000
 *
 * ENABLE_DYNAMIC_COMPRESSION (boolean)
 *   - Enable compression for dynamic responses (TanStack SSR, API routes)
 *   - Default: false (Cloudflare handles compression)
 *   - Set to "true" to compress dynamic responses at the origin
 *
 * Note: Static assets are streamed from disk with gzip compression.
 * Cloudflare caches responses, Vite hashes filenames.
 */

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
  "./dist/server/server.mjs",
);

// Optional compression for dynamic responses (TanStack SSR, API routes)
// When disabled, Cloudflare handles compression
const ENABLE_DYNAMIC_COMPRESSION =
  process.env.ENABLE_DYNAMIC_COMPRESSION === "true";

// MIME types eligible for compression
const COMPRESSIBLE_TYPES = [
  "text/",
  "application/javascript",
  "application/json",
  "application/xml",
  "image/svg+xml",
];

// Logging utilities
const log = {
  info: (message: string) => console.info(`[INFO] ${message}`),
  success: (message: string) => console.log(`[SUCCESS] ${message}`),
  warning: (message: string) => console.warn(`[WARNING] ${message}`),
  error: (message: string) => console.error(`[ERROR] ${message}`),
};

/**
 * Add basic security headers to response
 */
function addSecurityHeaders(headers: Headers): void {
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
 * Check if a MIME type is compressible
 */
function isMimeTypeCompressible(mimeType: string): boolean {
  const [baseType] = mimeType.split(";");
  const normalized = (baseType ?? mimeType).trim().toLowerCase();

  return COMPRESSIBLE_TYPES.some((type) =>
    type.endsWith("/") ? normalized.startsWith(type) : normalized === type,
  );
}

/**
 * Check if gzip is accepted in Accept-Encoding header
 */
function acceptsGzip(acceptEncoding: string): boolean {
  const encodings = acceptEncoding.split(",").map((e) => {
    const [name, ...params] = e.trim().split(";");
    const qParam = params.find((p) => p.trim().startsWith("q="));
    const q = qParam ? parseFloat(qParam.trim().slice(2)) : 1;
    return { name: name?.trim().toLowerCase(), q };
  });

  for (const { name, q } of encodings) {
    if (q <= 0) continue;
    if (name === "gzip" || name === "*") return true;
  }
  return false;
}

/**
 * Create static asset handler that streams from disk with compression
 */
function createStaticHandler(
  filepath: string,
  mimeType: string,
): (req: Request) => Response {
  return (req: Request) => {
    const method = req.method.toUpperCase();
    if (method !== "GET" && method !== "HEAD") {
      const headers = new Headers({
        Allow: "GET, HEAD",
        "Content-Type": "text/plain",
      });
      addSecurityHeaders(headers);
      return new Response("Method Not Allowed", { status: 405, headers });
    }

    const headers = new Headers({
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      Vary: "Accept-Encoding",
    });
    addSecurityHeaders(headers);

    const file = Bun.file(filepath);

    if (method === "HEAD") {
      return new Response(null, { headers });
    }

    // Compress with gzip if supported
    if (isMimeTypeCompressible(mimeType)) {
      const acceptEncoding = req.headers.get("accept-encoding") || "";

      if (acceptsGzip(acceptEncoding)) {
        headers.set("Content-Encoding", "gzip");
        ensureNoTransform(headers);
        headers.delete("Content-Length");

        const stream = file.stream().pipeThrough(new CompressionStream("gzip"));
        return new Response(stream, { headers });
      }
    }

    return new Response(file, { headers });
  };
}

/**
 * Scan client directory and build static routes
 */
async function buildStaticRoutes(
  clientDirectory: string,
): Promise<Record<string, (req: Request) => Response>> {
  const routes: Record<string, (req: Request) => Response> = {};
  const glob = new Bun.Glob("**/*");

  let count = 0;
  for await (const relativePath of glob.scan({ cwd: clientDirectory })) {
    const filepath = path.join(clientDirectory, relativePath);
    const file = Bun.file(filepath);

    // Skip directories and empty files
    if (!(await file.exists()) || file.size === 0) continue;

    const route = `/${relativePath.split(path.sep).join(path.posix.sep)}`;
    const mimeType = file.type || "application/octet-stream";

    routes[route] = createStaticHandler(filepath, mimeType);
    count++;
  }

  log.success(`Registered ${count} static asset routes`);
  return routes;
}

/**
 * Add a Server-Timing entry to response headers
 */
function addServerTiming(
  headers: Headers,
  name: string,
  duration: number,
): void {
  const existing = headers.get("Server-Timing");
  const entry = `${name};dur=${duration.toFixed(1)}`;
  headers.set("Server-Timing", existing ? `${existing}, ${entry}` : entry);
}

/**
 * Add no-transform to Cache-Control header
 */
function ensureNoTransform(headers: Headers): void {
  const cacheControl = headers.get("Cache-Control");
  if (cacheControl && !/no-transform/i.test(cacheControl)) {
    headers.set("Cache-Control", `${cacheControl}, no-transform`);
  } else if (!cacheControl) {
    headers.set("Cache-Control", "no-transform");
  }
}

/**
 * Optionally compress dynamic responses with gzip.
 * Note: Only gzip is used because Bun's brotli/zstd CompressionStream
 * implementations buffer the entire response, breaking SSR streaming.
 */
function compressResponse(response: Response, req: Request): Response {
  const headers = new Headers(response.headers);
  headers.append("Vary", "Accept-Encoding");
  addSecurityHeaders(headers);

  const respond = (body: RequestInit["body"] | null) =>
    new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });

  // Skip for non-success status codes
  if (response.status < 200 || response.status >= 300) {
    return respond(response.body);
  }

  // Skip if already compressed
  if (response.headers.get("content-encoding")) {
    ensureNoTransform(headers);
    return respond(response.body);
  }

  // Check content type
  const contentType = response.headers.get("content-type") || "";
  if (!isMimeTypeCompressible(contentType)) {
    return respond(response.body);
  }

  // Skip if no body or gzip not accepted
  const acceptEncoding = req.headers.get("accept-encoding") || "";
  if (!response.body || !acceptsGzip(acceptEncoding)) {
    return respond(response.body);
  }

  // Compress with gzip (the only encoding that streams properly in Bun)
  ensureNoTransform(headers);
  headers.set("Content-Encoding", "gzip");
  headers.delete("Content-Length");

  return respond(response.body.pipeThrough(new CompressionStream("gzip")));
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
          const handlerStart = performance.now();
          const response = await handler.fetch(req);
          const handlerDuration = performance.now() - handlerStart;

          if (ENABLE_DYNAMIC_COMPRESSION) {
            const compressStart = performance.now();
            const compressed = compressResponse(response, req);
            const compressDuration = performance.now() - compressStart;

            const headers = new Headers(compressed.headers);
            addServerTiming(headers, "origin", handlerDuration);
            addServerTiming(headers, "compress", compressDuration);
            return new Response(compressed.body, {
              status: compressed.status,
              statusText: compressed.statusText,
              headers,
            });
          }

          const headers = new Headers(response.headers);
          addServerTiming(headers, "origin", handlerDuration);
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          });
        } catch (error) {
          log.error(`Handler error: ${String(error)}`);
          const headers = new Headers({
            "Content-Type": "text/plain",
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
      log.error(`Server error: ${error.message}`);
      const headers = new Headers({
        "Content-Type": "text/plain",
      });
      addSecurityHeaders(headers);
      return new Response("Internal Server Error", { status: 500, headers });
    },
  });

  if (ENABLE_DYNAMIC_COMPRESSION) {
    log.info("Compression enabled for dynamic responses");
  }
  log.success(`Server listening on http://localhost:${server.port}`);
  return server;
}

// Start server
initializeServer()
  .then((server) => {
    const shutdown = (signal: string) => {
      log.info(`Received ${signal}, shutting down...`);
      void server.stop();
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  })
  .catch((error: unknown) => {
    log.error(`Failed to start: ${String(error)}`);
    process.exit(1);
  });
