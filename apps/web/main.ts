/**
 * PORT (number)
 *   - Server port number
 *   - Default: 3000
 *
 * ASSET_PRELOAD_MAX_SIZE (number)
 *   - Maximum file size in bytes to preload into memory
 *   - Files larger than this will be served on-demand from disk
 *   - Default: 5242880 (5MB)
 *   - Example: ASSET_PRELOAD_MAX_SIZE=5242880 (5MB)
 *
 * ASSET_PRELOAD_INCLUDE_PATTERNS (string)
 *   - Comma-separated list of glob patterns for files to include
 *   - If specified, only matching files are eligible for preloading
 *   - Patterns are matched against filenames only, not full paths
 *   - Example: ASSET_PRELOAD_INCLUDE_PATTERNS="*.js,*.css,*.woff2"
 *
 * ASSET_PRELOAD_EXCLUDE_PATTERNS (string)
 *   - Comma-separated list of glob patterns for files to exclude
 *   - Applied after include patterns
 *   - Patterns are matched against filenames only, not full paths
 *   - Example: ASSET_PRELOAD_EXCLUDE_PATTERNS="*.map,*.txt"
 *
 * ASSET_PRELOAD_VERBOSE_LOGGING (boolean)
 *   - Enable detailed logging of loaded and skipped files
 *   - Default: false
 *   - Set to "true" to enable verbose output
 *
 * ASSET_PRELOAD_ENABLE_ETAG (boolean)
 *   - Enable ETag generation for preloaded assets
 *   - Default: true
 *   - Set to "false" to disable ETag support
 *
 * ASSET_PRELOAD_ENABLE_COMPRESSION (boolean)
 *   - Enable compression (Gzip and Brotli) for eligible assets
 *   - Default: true
 *   - Set to "false" to disable all compression
 *
 * ASSET_PRELOAD_COMPRESSION_MIN_SIZE (number)
 *   - Minimum file size in bytes required for compression
 *   - Files smaller than this will not be compressed
 *   - Default: 1024 (1KB)
 *
 * ASSET_PRELOAD_COMPRESSION_MIME_TYPES (string)
 *   - Comma-separated list of MIME types eligible for compression
 *   - Supports partial matching for types ending with "/"
 *   - Default: text/,application/javascript,application/json,application/xml,image/svg+xml
 *
 * Note: Dynamic responses (HTML pages, API routes) use gzip compression only.
 * Static assets use both gzip and brotli (pre-compressed at startup).
 */

import path from "node:path";
import { brotliCompressSync } from "node:zlib";

// Configuration
const SERVER_PORT = Number(process.env.PORT ?? 3000);
const CLIENT_DIRECTORY = path.join(import.meta.dir, "./dist/client");
const SERVER_ENTRY_POINT = path.join(
  import.meta.dir,
  "./dist/server/server.mjs",
);

// Logging utilities for professional output
const log = {
  info: (message: string) => {
    console.info(`[INFO] ${message}`);
  },
  success: (message: string) => {
    console.log(`[SUCCESS] ${message}`);
  },
  warning: (message: string) => {
    console.warn(`[WARNING] ${message}`);
  },
  error: (message: string) => {
    console.error(`[ERROR] ${message}`);
  },
  header: (message: string) => {
    console.log(`\n${message}\n`);
  },
};

/**
 * Add basic security headers to response
 * CSP should be handled in the TanStack Start handler
 */
function addSecurityHeaders(headers: Record<string, string>): void {
  headers["X-Content-Type-Options"] = "nosniff";
  headers["X-Frame-Options"] = "DENY";
  headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
  headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
}

// Preloading configuration from environment variables
const MAX_PRELOAD_BYTES = Number(
  process.env.ASSET_PRELOAD_MAX_SIZE ?? 5 * 1024 * 1024, // 5MB default
);

// Parse comma-separated include patterns (no defaults)
const INCLUDE_PATTERNS = (process.env.ASSET_PRELOAD_INCLUDE_PATTERNS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((pattern: string) => convertGlobToRegExp(pattern));

// Parse comma-separated exclude patterns (no defaults)
const EXCLUDE_PATTERNS = (process.env.ASSET_PRELOAD_EXCLUDE_PATTERNS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((pattern: string) => convertGlobToRegExp(pattern));

// Verbose logging flag
const VERBOSE = process.env.ASSET_PRELOAD_VERBOSE_LOGGING === "true";

// Optional ETag feature
const ENABLE_ETAG =
  (process.env.ASSET_PRELOAD_ENABLE_ETAG ?? "true") === "true";

// Optional compression feature (Gzip and Brotli for static assets)
const ENABLE_COMPRESSION =
  (process.env.ASSET_PRELOAD_ENABLE_COMPRESSION ?? "true") === "true";
const COMPRESSION_MIN_BYTES = Number(
  process.env.ASSET_PRELOAD_COMPRESSION_MIN_SIZE ?? 1024,
); // 1KB
const COMPRESSION_MIME_TYPES = (
  process.env.ASSET_PRELOAD_COMPRESSION_MIME_TYPES ??
  "text/,application/javascript,application/json,application/xml,image/svg+xml"
)
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

/**
 * Convert a simple glob pattern to a regular expression
 * Supports * wildcard for matching any characters
 */
function convertGlobToRegExp(globPattern: string): RegExp {
  // Escape regex special chars except *, then replace * with .*
  const escapedPattern = globPattern
    .replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escapedPattern}$`, "i");
}

/**
 * Compute ETag for a given data buffer
 */
function computeEtag(data: Uint8Array): string {
  const hash = Bun.hash(data);
  return `W/"${hash.toString(16)}-${data.byteLength.toString()}"`;
}

/**
 * Metadata for preloaded static assets
 */
interface AssetMetadata {
  route: string;
  size: number;
  type: string;
}

/**
 * In-memory asset with ETag and compression support (Gzip and Brotli)
 */
interface InMemoryAsset {
  raw: Uint8Array;
  gz?: Uint8Array;
  br?: Uint8Array;
  etag?: string;
  type: string;
  immutable: boolean;
  size: number;
}

/**
 * Result of static asset preloading process
 */
interface PreloadResult {
  routes: Record<string, (req: Request) => Response | Promise<Response>>;
  loaded: AssetMetadata[];
  skipped: AssetMetadata[];
}

/**
 * Check if a file is eligible for preloading based on configured patterns
 */
function isFileEligibleForPreloading(relativePath: string): boolean {
  const fileName = relativePath.split(/[/\\]/).pop() ?? relativePath;

  // If include patterns are specified, file must match at least one
  if (INCLUDE_PATTERNS.length > 0) {
    if (!INCLUDE_PATTERNS.some((pattern) => pattern.test(fileName))) {
      return false;
    }
  }

  // If exclude patterns are specified, file must not match any
  if (EXCLUDE_PATTERNS.some((pattern) => pattern.test(fileName))) {
    return false;
  }

  return true;
}

/**
 * Check if a MIME type is compressible
 */
function isMimeTypeCompressible(mimeType: string): boolean {
  return COMPRESSION_MIME_TYPES.some((type) =>
    type.endsWith("/") ? mimeType.startsWith(type) : mimeType === type,
  );
}

/**
 * Compress data with Gzip using Bun's native implementation
 */
function compressWithGzip(
  data: Uint8Array,
  mimeType: string,
): Uint8Array | undefined {
  if (!ENABLE_COMPRESSION) return undefined;
  if (data.byteLength < COMPRESSION_MIN_BYTES) return undefined;
  if (!isMimeTypeCompressible(mimeType)) return undefined;
  try {
    return Bun.gzipSync(data.buffer as ArrayBuffer);
  } catch (error) {
    log.warning(
      `Failed to gzip compress data (${data.byteLength} bytes): ${String(error)}`,
    );
    return undefined;
  }
}

/**
 * Compress data with Brotli (better compression than Gzip)
 */
function compressWithBrotli(
  data: Uint8Array,
  mimeType: string,
): Uint8Array | undefined {
  if (!ENABLE_COMPRESSION) return undefined;
  if (data.byteLength < COMPRESSION_MIN_BYTES) return undefined;
  if (!isMimeTypeCompressible(mimeType)) return undefined;
  try {
    return brotliCompressSync(data);
  } catch (error) {
    log.warning(
      `Failed to brotli compress data (${data.byteLength} bytes): ${String(error)}`,
    );
    return undefined;
  }
}

/**
 * Create response handler function with ETag and compression support
 */
function createResponseHandler(
  asset: InMemoryAsset,
): (req: Request) => Response {
  return (req: Request) => {
    const headers: Record<string, string> = {
      "Content-Type": asset.type,
      "Cache-Control": asset.immutable
        ? "public, max-age=31536000, immutable"
        : "public, max-age=3600",
    };

    // Add security headers
    addSecurityHeaders(headers);

    if (ENABLE_ETAG && asset.etag) {
      const ifNone = req.headers.get("if-none-match");
      if (ifNone && ifNone === asset.etag) {
        const etagHeaders: Record<string, string> = { ETag: asset.etag };
        addSecurityHeaders(etagHeaders);
        return new Response(null, {
          status: 304,
          headers: etagHeaders,
        });
      }
      headers.ETag = asset.etag;
    }

    const acceptEncoding = req.headers.get("accept-encoding") || "";

    // Prefer Brotli over Gzip (better compression)
    if (ENABLE_COMPRESSION && asset.br && acceptEncoding.includes("br")) {
      headers["Content-Encoding"] = "br";
      headers["Content-Length"] = String(asset.br.byteLength);
      return new Response(asset.br.buffer as ArrayBuffer, {
        status: 200,
        headers,
      });
    }

    if (ENABLE_COMPRESSION && asset.gz && acceptEncoding.includes("gzip")) {
      headers["Content-Encoding"] = "gzip";
      headers["Content-Length"] = String(asset.gz.byteLength);
      return new Response(asset.gz.buffer as ArrayBuffer, {
        status: 200,
        headers,
      });
    }

    headers["Content-Length"] = String(asset.raw.byteLength);
    return new Response(asset.raw.buffer as ArrayBuffer, {
      status: 200,
      headers,
    });
  };
}

/**
 * Create composite glob pattern from include patterns
 */
function createCompositeGlobPattern(): Bun.Glob {
  const raw = (process.env.ASSET_PRELOAD_INCLUDE_PATTERNS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (raw.length === 0) return new Bun.Glob("**/*");
  if (raw.length === 1) return new Bun.Glob(raw[0]!);
  return new Bun.Glob(`{${raw.join(",")}}`);
}

/**
 * Initialize static routes with intelligent preloading strategy
 * Small files are loaded into memory, large files are served on-demand
 */
async function initializeStaticRoutes(
  clientDirectory: string,
): Promise<PreloadResult> {
  const routes: Record<string, (req: Request) => Response | Promise<Response>> =
    {};
  const loaded: AssetMetadata[] = [];
  const skipped: AssetMetadata[] = [];

  log.info(`Loading static assets from ${clientDirectory}...`);
  if (VERBOSE) {
    console.log(
      `Max preload size: ${(MAX_PRELOAD_BYTES / 1024 / 1024).toFixed(2)} MB`,
    );
    if (INCLUDE_PATTERNS.length > 0) {
      console.log(
        `Include patterns: ${process.env.ASSET_PRELOAD_INCLUDE_PATTERNS ?? ""}`,
      );
    }
    if (EXCLUDE_PATTERNS.length > 0) {
      console.log(
        `Exclude patterns: ${process.env.ASSET_PRELOAD_EXCLUDE_PATTERNS ?? ""}`,
      );
    }
  }

  let totalPreloadedBytes = 0;

  try {
    const glob = createCompositeGlobPattern();
    for await (const relativePath of glob.scan({ cwd: clientDirectory })) {
      const filepath = path.join(clientDirectory, relativePath);
      const route = `/${relativePath.split(path.sep).join(path.posix.sep)}`;

      try {
        // Get file metadata
        const file = Bun.file(filepath);

        // Skip if file doesn't exist or is empty
        if (!(await file.exists()) || file.size === 0) {
          continue;
        }

        const metadata: AssetMetadata = {
          route,
          size: file.size,
          type: file.type || "application/octet-stream",
        };

        // Determine if file should be preloaded
        const matchesPattern = isFileEligibleForPreloading(relativePath);
        const withinSizeLimit = file.size <= MAX_PRELOAD_BYTES;

        if (matchesPattern && withinSizeLimit) {
          // Preload small files into memory with ETag and compression support
          const bytes = new Uint8Array(await file.arrayBuffer());
          const gz = compressWithGzip(bytes, metadata.type);
          const br = compressWithBrotli(bytes, metadata.type);
          const etag = ENABLE_ETAG ? computeEtag(bytes) : undefined;
          const asset: InMemoryAsset = {
            raw: bytes,
            gz,
            br,
            etag,
            type: metadata.type,
            immutable: true,
            size: bytes.byteLength,
          };
          routes[route] = createResponseHandler(asset);

          // Calculate actual memory usage (raw + compressed versions)
          const actualMemoryUsage =
            bytes.byteLength + (gz?.byteLength ?? 0) + (br?.byteLength ?? 0);

          loaded.push({ ...metadata, size: bytes.byteLength });
          totalPreloadedBytes += actualMemoryUsage;
        } else {
          // Serve large or filtered files on-demand
          routes[route] = () => {
            const fileOnDemand = Bun.file(filepath);
            return new Response(fileOnDemand, {
              headers: {
                "Content-Type": metadata.type,
                "Cache-Control": "public, max-age=3600",
              },
            });
          };

          skipped.push(metadata);
        }
      } catch (error: unknown) {
        // Skip directories silently, log other errors
        const errorCode =
          error && typeof error === "object" && "code" in error
            ? error.code
            : null;
        if (errorCode !== "EISDIR") {
          log.error(
            `Failed to load ${filepath}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }

    // Show detailed file overview only when verbose mode is enabled
    if (VERBOSE && (loaded.length > 0 || skipped.length > 0)) {
      const allFiles = [...loaded, ...skipped].sort((a, b) =>
        a.route.localeCompare(b.route),
      );

      // Calculate max path length for alignment
      const maxPathLength = Math.min(
        Math.max(...allFiles.map((f) => f.route.length)),
        60,
      );

      // Format file size with KB and actual gzip size
      const formatFileSize = (bytes: number, gzBytes?: number) => {
        const kb = bytes / 1024;
        const sizeStr = kb < 100 ? kb.toFixed(2) : kb.toFixed(1);

        if (gzBytes !== undefined) {
          const gzKb = gzBytes / 1024;
          const gzStr = gzKb < 100 ? gzKb.toFixed(2) : gzKb.toFixed(1);
          return {
            size: sizeStr,
            gzip: gzStr,
          };
        }

        // Rough gzip estimation (typically 30-70% compression) if no actual gzip data
        const gzipKb = kb * 0.35;
        return {
          size: sizeStr,
          gzip: gzipKb < 100 ? gzipKb.toFixed(2) : gzipKb.toFixed(1),
        };
      };

      if (loaded.length > 0) {
        console.log("\n📁 Preloaded into memory:");
        console.log(
          "Path                                          │    Size │ Gzip Size",
        );
        loaded
          .sort((a, b) => a.route.localeCompare(b.route))
          .forEach((file) => {
            const { size, gzip } = formatFileSize(file.size);
            const paddedPath = file.route.padEnd(maxPathLength);
            const sizeStr = `${size.padStart(7)} kB`;
            const gzipStr = `${gzip.padStart(7)} kB`;
            console.log(`${paddedPath} │ ${sizeStr} │  ${gzipStr}`);
          });
      }

      if (skipped.length > 0) {
        console.log("\n💾 Served on-demand:");
        console.log(
          "Path                                          │    Size │ Gzip Size",
        );
        skipped
          .sort((a, b) => a.route.localeCompare(b.route))
          .forEach((file) => {
            const { size, gzip } = formatFileSize(file.size);
            const paddedPath = file.route.padEnd(maxPathLength);
            const sizeStr = `${size.padStart(7)} kB`;
            const gzipStr = `${gzip.padStart(7)} kB`;
            console.log(`${paddedPath} │ ${sizeStr} │  ${gzipStr}`);
          });
      }
    }

    // Log summary after the file list
    if (loaded.length > 0) {
      log.success(
        `Preloaded ${String(loaded.length)} files (${(totalPreloadedBytes / 1024 / 1024).toFixed(2)} MB) into memory`,
      );
    } else {
      log.info("No files preloaded into memory");
    }

    if (skipped.length > 0) {
      const tooLarge = skipped.filter((f) => f.size > MAX_PRELOAD_BYTES).length;
      const filtered = skipped.length - tooLarge;
      log.info(
        `${String(skipped.length)} files will be served on-demand (${String(tooLarge)} too large, ${String(filtered)} filtered)`,
      );
    }
  } catch (error) {
    log.error(
      `Failed to load static files from ${clientDirectory}: ${String(error)}`,
    );
  }

  return { routes, loaded, skipped };
}

/**
 * Wrap a response with compression if appropriate
 * Uses gzip only for dynamic content (much faster than brotli)
 */
async function compressResponse(
  response: Response,
  acceptEncoding: string,
): Promise<Response> {
  // Skip compression for certain status codes
  if (
    response.status === 204 || // No Content
    response.status === 304 || // Not Modified
    response.status < 200 || // Informational
    response.status >= 300 // Redirects and errors with small bodies
  ) {
    return response;
  }

  // Skip if already compressed
  if (response.headers.get("content-encoding")) {
    return response;
  }

  // Check content type
  const contentType = response.headers.get("content-type") || "";
  if (!isMimeTypeCompressible(contentType)) {
    return response;
  }

  // Get response body
  const body = await response.arrayBuffer();
  const bytes = new Uint8Array(body);

  // Skip if too small
  if (bytes.byteLength < COMPRESSION_MIN_BYTES) {
    // Body already consumed, must create new response with original bytes
    return new Response(bytes.buffer, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }

  // Clone headers
  const headers = new Headers(response.headers);

  // Use gzip only for dynamic responses (brotli is too slow, adds ~100ms)
  // For static assets, brotli is pre-compressed at startup with no runtime cost
  if (acceptEncoding.includes("gzip")) {
    const compressed = compressWithGzip(bytes, contentType);
    if (compressed) {
      headers.set("Content-Encoding", "gzip");
      headers.set("Content-Length", String(compressed.byteLength));
      headers.delete("Content-Range"); // Remove range headers if present
      return new Response(compressed.buffer as ArrayBuffer, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }
  }

  // Return original bytes if compression failed or not supported
  // Body already consumed, must create new response
  return new Response(bytes.buffer, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

/**
 * Initialize the server
 */
async function initializeServer() {
  // Load TanStack Start server handler
  let handler: { fetch: (request: Request) => Response | Promise<Response> };
  try {
    const serverModule = (await import(SERVER_ENTRY_POINT)) as {
      default: { fetch: (request: Request) => Response | Promise<Response> };
    };
    handler = serverModule.default;
    log.success("TanStack Start application handler initialized");
  } catch (error) {
    log.error(`Failed to load server handler: ${String(error)}`);
    process.exit(1);
  }

  // Build static routes with intelligent preloading
  const { routes, loaded, skipped } =
    await initializeStaticRoutes(CLIENT_DIRECTORY);
  const serverStartTime = Date.now();

  // Create Bun server
  const server = Bun.serve({
    port: SERVER_PORT,

    routes: {
      // Health check endpoint
      "/health": () => {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        addSecurityHeaders(headers);

        const healthData = {
          status: "healthy",
          uptime: Math.floor((Date.now() - serverStartTime) / 1000),
          assets: {
            preloaded: loaded.length,
            onDemand: skipped.length,
            total: loaded.length + skipped.length,
          },
          memory: {
            rss: process.memoryUsage().rss,
            heapUsed: process.memoryUsage().heapUsed,
            heapTotal: process.memoryUsage().heapTotal,
          },
        };

        return new Response(JSON.stringify(healthData, null, 2), {
          status: 200,
          headers,
        });
      },

      // Serve static assets (preloaded or on-demand)
      ...routes,

      // Fallback to TanStack Start handler for all other routes
      "/*": async (req: Request) => {
        try {
          const response = await handler.fetch(req);
          const acceptEncoding = req.headers.get("accept-encoding") || "";
          return compressResponse(response, acceptEncoding);
        } catch (error) {
          log.error(`Server handler error: ${String(error)}`);
          return new Response("Internal Server Error", { status: 500 });
        }
      },
    },

    // Global error handler
    error(error) {
      log.error(
        `Uncaught server error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return new Response("Internal Server Error", { status: 500 });
    },
  });

  log.success(`Server listening on http://localhost:${String(server.port)}`);

  return server;
}

// Initialize the server
initializeServer()
  .then((server) => {
    // Graceful shutdown handler
    const shutdown = (signal: string) => {
      log.info(`\nReceived ${signal}, starting graceful shutdown...`);

      try {
        // Stop accepting new connections
        server.stop();
        log.success("Server stopped successfully");

        // Exit cleanly
        process.exit(0);
      } catch (error) {
        log.error(`Error during shutdown: ${String(error)}`);
        process.exit(1);
      }
    };

    // Register shutdown handlers
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  })
  .catch((error: unknown) => {
    log.error(`Failed to start server: ${String(error)}`);
    process.exit(1);
  });
