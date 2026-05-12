import {
  type Headers as PlatformHeaders,
  HttpClient,
  HttpClientRequest,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform";
import { Effect, Option } from "effect";
import { canonicalize, canonicalizeRpc } from "./canonicalize";
import { Env } from "./env";
import { Recorder } from "./recorder";
import type { InteractionKind } from "./schema";
import type { InteractionInsert } from "./types";
import { decodeWorkerToken, encodeWorkerToken } from "./url-token";

const HOP_BY_HOP = new Set([
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "upgrade",
  "te",
  "keep-alive",
  "proxy-connection",
]);

function filterHeaders(input: PlatformHeaders.Headers): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (HOP_BY_HOP.has(k)) continue;
    out[k] = v;
  }
  return out;
}

function headersToArray(input: Record<string, string>): [string, string][] {
  return Object.entries(input);
}

function decompressIfNeeded(
  bytes: Uint8Array<ArrayBuffer>,
  encoding: string | null,
): Uint8Array<ArrayBuffer> {
  if (encoding === "gzip") return Bun.gunzipSync(bytes);
  if (encoding === "deflate") return Bun.inflateSync(bytes);
  return bytes;
}

function extractMeta(
  kind: InteractionKind,
  reqBody: Uint8Array,
  resBody: Uint8Array,
): {
  blockFrom: number | null;
  blockTo: number | null;
  workerUrl: string | null;
  height: number | null;
  rpcMethod: string | null;
} {
  const empty = {
    blockFrom: null,
    blockTo: null,
    workerUrl: null,
    height: null,
    rpcMethod: null,
  };
  const td = new TextDecoder();
  if (kind === "height") {
    const n = Number.parseInt(td.decode(resBody).trim(), 10);
    return { ...empty, height: Number.isFinite(n) ? n : null };
  }
  if (kind === "worker-lookup") {
    const text = td.decode(resBody).trim();
    return { ...empty, workerUrl: text.length > 0 ? text : null };
  }
  if (kind === "worker-query") {
    try {
      const body = JSON.parse(td.decode(reqBody)) as Record<string, unknown>;
      const fromRaw = body.fromBlock;
      const toRaw = body.toBlock;
      const from =
        typeof fromRaw === "number"
          ? fromRaw
          : typeof fromRaw === "string"
            ? Number.parseInt(fromRaw, 10)
            : NaN;
      const to =
        typeof toRaw === "number"
          ? toRaw
          : typeof toRaw === "string"
            ? Number.parseInt(toRaw, 10)
            : NaN;
      return {
        ...empty,
        blockFrom: Number.isFinite(from) ? from : null,
        blockTo: Number.isFinite(to) ? to : null,
      };
    } catch {
      return empty;
    }
  }
  if (kind === "rpc") {
    try {
      const body = JSON.parse(td.decode(reqBody)) as
        | { method?: unknown }
        | { method?: unknown }[];
      const methods = Array.isArray(body)
        ? body
            .map((c) => (typeof c.method === "string" ? c.method : null))
            .filter((m): m is string => m !== null)
        : typeof body.method === "string"
          ? [body.method]
          : [];
      return { ...empty, rpcMethod: methods[0] ?? null };
    } catch {
      return empty;
    }
  }
  return empty;
}

/**
 * @effect-expect-leaking HttpServerRequest
 */
export class Proxy extends Effect.Service<Proxy>()("app/Proxy", {
  effect: Effect.gen(function* () {
    const env = yield* Env;
    const recorder = yield* Recorder;
    const client = yield* HttpClient.HttpClient;

    function externalBase(req: HttpServerRequest.HttpServerRequest): string {
      if (Option.isSome(env.externalBaseUrl)) {
        return env.externalBaseUrl.value;
      }
      try {
        return new URL(req.url).origin;
      } catch {
        return `http://localhost:${env.port}`;
      }
    }

    const proxyOne = Effect.fn("Proxy.proxy")(function* (params: {
      kind: InteractionKind;
      upstreamUrl: string;
      rewriteWorkerUrl: boolean;
    }) {
      const req = yield* HttpServerRequest.HttpServerRequest;
      const id = crypto.randomUUID();
      const ts = new Date().toISOString();
      const t0 = performance.now();

      const reqUrl = new URL(req.url, "http://x");
      const incomingPath = reqUrl.pathname + reqUrl.search;
      const outboundHeaders = filterHeaders(req.headers);

      const reqBuffer = yield* req.arrayBuffer.pipe(
        Effect.catchTag("RequestError", () =>
          Effect.succeed(new ArrayBuffer(0)),
        ),
      );
      const reqBytes = new Uint8Array(reqBuffer);

      const { canonical, hash } =
        params.kind === "worker-query"
          ? canonicalize(reqBytes)
          : params.kind === "rpc"
            ? canonicalizeRpc(reqBytes)
            : { canonical: null, hash: null };

      const upstreamReq = HttpClientRequest.make(req.method)(
        params.upstreamUrl,
      ).pipe(
        HttpClientRequest.setHeaders(outboundHeaders),
        reqBytes.byteLength > 0
          ? HttpClientRequest.bodyUint8Array(
              reqBytes,
              outboundHeaders["content-type"] ?? "application/octet-stream",
            )
          : (r) => r,
      );

      const result = yield* Effect.gen(function* () {
        const res = yield* client.execute(upstreamReq);
        const buf = yield* res.arrayBuffer;
        return { res, buf };
      }).pipe(Effect.either);

      if (result._tag === "Left") {
        const message = String(result.left);
        const errBody = new TextEncoder().encode(`upstream error: ${message}`);
        const entry: InteractionInsert = {
          id,
          ts,
          tsEnd: new Date().toISOString(),
          durationMs: Math.round(performance.now() - t0),
          kind: params.kind,
          reqMethod: req.method,
          reqPath: incomingPath,
          reqUpstream: params.upstreamUrl,
          reqHeaders: headersToArray(outboundHeaders),
          reqBody: reqBytes,
          reqHash: hash,
          reqCanonical: canonical,
          resStatus: 0,
          resStatusText: "",
          resHeaders: [],
          resContentEncoding: null,
          resBody: new Uint8Array(0),
          resBodyTruncated: false,
          proxyError: message,
          blockFrom: null,
          blockTo: null,
          workerUrl: null,
          height: null,
          rpcMethod: null,
        };
        yield* recorder.offer(entry);
        return HttpServerResponse.uint8Array(errBody, {
          status: 502,
          contentType: "text/plain",
        });
      }

      const upstreamRes = result.right.res;
      const upstreamBytes = new Uint8Array(result.right.buf as ArrayBuffer);
      const truncated = upstreamBytes.byteLength > env.recordBodyLimitBytes;
      const recordedBytes = truncated
        ? upstreamBytes.subarray(0, env.recordBodyLimitBytes)
        : upstreamBytes;

      const resHeadersRaw = Object.fromEntries(
        Object.entries(upstreamRes.headers).filter(
          ([k]) => !HOP_BY_HOP.has(k.toLowerCase()),
        ),
      );
      const contentEncoding = resHeadersRaw["content-encoding"] ?? null;

      const meta = extractMeta(
        params.kind,
        reqBytes,
        params.kind === "worker-lookup"
          ? decompressIfNeeded(upstreamBytes, contentEncoding)
          : upstreamBytes,
      );

      let responseBody: Uint8Array<ArrayBuffer> = upstreamBytes;
      let responseHeaders = resHeadersRaw;
      if (
        params.rewriteWorkerUrl &&
        upstreamRes.status >= 200 &&
        upstreamRes.status < 300 &&
        meta.workerUrl !== null
      ) {
        const rewritten = `${externalBase(req)}/_worker/${encodeWorkerToken(meta.workerUrl)}`;
        responseBody = new TextEncoder().encode(rewritten);
        responseHeaders = { ...resHeadersRaw };
        delete responseHeaders["content-encoding"];
        delete responseHeaders["content-length"];
      }

      const entry: InteractionInsert = {
        id,
        ts,
        tsEnd: new Date().toISOString(),
        durationMs: Math.round(performance.now() - t0),
        kind: params.kind,
        reqMethod: req.method,
        reqPath: incomingPath,
        reqUpstream: params.upstreamUrl,
        reqHeaders: headersToArray(outboundHeaders),
        reqBody: reqBytes,
        reqHash: hash,
        reqCanonical: canonical,
        resStatus: upstreamRes.status,
        resStatusText: "",
        resHeaders: headersToArray(resHeadersRaw),
        resContentEncoding: contentEncoding,
        resBody: recordedBytes,
        resBodyTruncated: truncated,
        proxyError: null,
        ...meta,
      };
      yield* recorder.offer(entry);

      return HttpServerResponse.uint8Array(responseBody, {
        status: upstreamRes.status,
        headers: responseHeaders,
      });
    });

    const handleHeight = proxyOne({
      kind: "height",
      upstreamUrl: `${env.upstreamUrl}/height`,
      rewriteWorkerUrl: false,
    });

    const handleWorkerLookup = Effect.fn("Proxy.handleWorkerLookup")(function* (
      fromBlock: string,
    ) {
      return yield* proxyOne({
        kind: "worker-lookup",
        upstreamUrl: `${env.upstreamUrl}/${fromBlock}/worker`,
        rewriteWorkerUrl: true,
      });
    });

    const handleWorkerQuery = Effect.fn("Proxy.handleWorkerQuery")(function* (
      token: string,
    ) {
      const decoded = yield* Effect.either(decodeWorkerToken(token));

      if (decoded._tag === "Left") {
        return HttpServerResponse.text(String(decoded.left.cause), {
          status: 400,
        });
      }
      return yield* proxyOne({
        kind: "worker-query",
        upstreamUrl: decoded.right.toString(),
        rewriteWorkerUrl: false,
      });
    });

    const handleRpc = proxyOne({
      kind: "rpc",
      upstreamUrl: env.upstreamRpcUrl.toString(),
      rewriteWorkerUrl: false,
    });

    return {
      handleHeight,
      handleWorkerLookup,
      handleWorkerQuery,
      handleRpc,
    };
  }),
  dependencies: [Env.Default, Recorder.Default],
}) {}
