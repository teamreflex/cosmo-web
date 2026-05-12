import { canonicalize } from "./canonicalize";
import { env } from "./env";
import type { ProxyRecord, RecordKind } from "./record-types";
import type { Recorder } from "./recorder";
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

const EMPTY_BYTES: Uint8Array<ArrayBuffer> = new Uint8Array(0);
const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function filterHeaders(input: Headers): Headers {
  const out = new Headers();
  for (const [name, value] of input.entries()) {
    if (HOP_BY_HOP.has(name)) continue;
    out.append(name, value);
  }
  return out;
}

function headersToArray(headers: Headers): [string, string][] {
  return Array.from(headers.entries());
}

async function readRequestBytes(
  req: Request,
): Promise<Uint8Array<ArrayBuffer>> {
  if (req.body === null) return EMPTY_BYTES;
  return new Uint8Array(await req.arrayBuffer());
}

async function drainToBuffer(
  stream: ReadableStream<Uint8Array>,
  limit: number,
): Promise<{
  bytes: Uint8Array<ArrayBuffer>;
  truncated: boolean;
  truncatedAt: number | null;
}> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  let truncatedAt: number | null = null;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (total >= limit) continue;
    if (total + value.byteLength > limit) {
      const sliceEnd = limit - total;
      chunks.push(value.subarray(0, sliceEnd));
      truncated = true;
      truncatedAt = total;
      total = limit;
    } else {
      chunks.push(value);
      total += value.byteLength;
    }
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes, truncated, truncatedAt };
}

function extractMeta(
  kind: RecordKind,
  requestBytes: Uint8Array,
  responseBytes: Uint8Array,
): ProxyRecord["meta"] {
  if (kind === "height") {
    const text = textDecoder.decode(responseBytes).trim();
    const n = Number.parseInt(text, 10);
    return {
      blockRange: null,
      workerUrl: null,
      height: Number.isFinite(n) ? n : null,
    };
  }
  if (kind === "worker-lookup") {
    const text = textDecoder.decode(responseBytes).trim();
    return {
      blockRange: null,
      workerUrl: text.length > 0 ? text : null,
      height: null,
    };
  }
  // worker-query
  try {
    const body = JSON.parse(textDecoder.decode(requestBytes)) as Record<
      string,
      unknown
    >;
    const fromRaw = body.fromBlock;
    const toRaw = body.toBlock;
    const from =
      typeof fromRaw === "number"
        ? fromRaw
        : typeof fromRaw === "string"
          ? Number.parseInt(fromRaw, 10)
          : NaN;
    if (!Number.isFinite(from))
      return { blockRange: null, workerUrl: null, height: null };
    const to =
      typeof toRaw === "number"
        ? toRaw
        : typeof toRaw === "string"
          ? Number.parseInt(toRaw, 10)
          : null;
    return {
      blockRange: {
        from,
        to: typeof to === "number" && Number.isFinite(to) ? to : null,
      },
      workerUrl: null,
      height: null,
    };
  } catch {
    return { blockRange: null, workerUrl: null, height: null };
  }
}

export class Proxy {
  #recorder: Recorder;
  #externalBaseUrl: string;
  #pending = new Set<Promise<void>>();

  constructor(recorder: Recorder, externalBaseUrl: string) {
    this.#recorder = recorder;
    this.#externalBaseUrl = externalBaseUrl;
  }

  handleHeight(req: Request): Promise<Response> {
    return this.#proxyStream(req, "height", `${env.UPSTREAM_URL}/height`);
  }

  handleWorkerLookup(req: Request, fromBlock: string): Promise<Response> {
    return this.#proxyWorkerLookup(
      req,
      `${env.UPSTREAM_URL}/${fromBlock}/worker`,
    );
  }

  handleWorkerQuery(req: Request, token: string): Promise<Response> {
    let upstreamUrl: URL;
    try {
      upstreamUrl = decodeWorkerToken(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[archive] ${message}`);
      return Promise.resolve(
        new Response(message, {
          status: 400,
          headers: { "content-type": "text/plain" },
        }),
      );
    }
    return this.#proxyStream(req, "worker-query", upstreamUrl.toString());
  }

  async drain(): Promise<void> {
    await Promise.allSettled(this.#pending);
  }

  #track(task: Promise<void>): void {
    this.#pending.add(task);
    void task.finally(() => this.#pending.delete(task));
  }

  async #proxyStream(
    req: Request,
    kind: RecordKind,
    upstreamUrl: string,
  ): Promise<Response> {
    const id = crypto.randomUUID();
    const ts = new Date().toISOString();
    const t0 = performance.now();
    const reqUrl = new URL(req.url);
    const incomingPath = reqUrl.pathname + reqUrl.search;
    const outboundHeaders = filterHeaders(req.headers);
    const outboundHeadersArr = headersToArray(outboundHeaders);
    const requestBytes = await readRequestBytes(req);
    const { canonical, hash } =
      kind === "worker-query"
        ? canonicalize(requestBytes)
        : { canonical: null, hash: null };

    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(upstreamUrl, {
        method: req.method,
        headers: outboundHeaders,
        body: requestBytes.byteLength > 0 ? requestBytes : undefined,
        signal: req.signal,
        decompress: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const errBody = textEncoder.encode(`upstream error: ${message}`);
      this.#recorder.record({
        schemaVersion: 1,
        id,
        ts,
        tsEnd: new Date().toISOString(),
        durationMs: performance.now() - t0,
        kind,
        req: {
          method: req.method,
          incomingPath,
          upstreamUrl,
          headers: outboundHeadersArr,
          bodyBase64: toBase64(requestBytes),
          bodyHash: hash,
          bodyCanonical: canonical,
        },
        res: {
          status: 0,
          statusText: "",
          headers: [],
          contentEncoding: null,
          bodyBase64: toBase64(errBody),
          bodyTruncated: false,
          bodyTruncatedAt: null,
        },
        proxyError: message,
        meta: { blockRange: null, workerUrl: null, height: null },
      });
      return new Response(errBody, {
        status: 502,
        headers: { "content-type": "text/plain" },
      });
    }

    const responseHeaders = filterHeaders(upstreamRes.headers);
    const responseHeadersArr = headersToArray(responseHeaders);
    const contentEncoding = upstreamRes.headers.get("content-encoding");

    if (upstreamRes.body === null) {
      this.#recorder.record({
        schemaVersion: 1,
        id,
        ts,
        tsEnd: new Date().toISOString(),
        durationMs: performance.now() - t0,
        kind,
        req: {
          method: req.method,
          incomingPath,
          upstreamUrl,
          headers: outboundHeadersArr,
          bodyBase64: toBase64(requestBytes),
          bodyHash: hash,
          bodyCanonical: canonical,
        },
        res: {
          status: upstreamRes.status,
          statusText: upstreamRes.statusText,
          headers: responseHeadersArr,
          contentEncoding,
          bodyBase64: "",
          bodyTruncated: false,
          bodyTruncatedAt: null,
        },
        proxyError: null,
        meta: extractMeta(kind, requestBytes, EMPTY_BYTES),
      });
      return new Response(null, {
        status: upstreamRes.status,
        statusText: upstreamRes.statusText,
        headers: responseHeaders,
      });
    }

    const [forClient, forRecorder] = upstreamRes.body.tee();
    const recordingTask = (async () => {
      try {
        const { bytes, truncated, truncatedAt } = await drainToBuffer(
          forRecorder,
          env.RECORD_BODY_LIMIT_BYTES,
        );
        this.#recorder.record({
          schemaVersion: 1,
          id,
          ts,
          tsEnd: new Date().toISOString(),
          durationMs: performance.now() - t0,
          kind,
          req: {
            method: req.method,
            incomingPath,
            upstreamUrl,
            headers: outboundHeadersArr,
            bodyBase64: toBase64(requestBytes),
            bodyHash: hash,
            bodyCanonical: canonical,
          },
          res: {
            status: upstreamRes.status,
            statusText: upstreamRes.statusText,
            headers: responseHeadersArr,
            contentEncoding,
            bodyBase64: toBase64(bytes),
            bodyTruncated: truncated,
            bodyTruncatedAt: truncatedAt,
          },
          proxyError: null,
          meta: extractMeta(kind, requestBytes, bytes),
        });
      } catch (err) {
        console.error(`[archive] drain failed for ${id}:`, err);
      }
    })();
    this.#track(recordingTask);

    return new Response(forClient, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: responseHeaders,
    });
  }

  async #proxyWorkerLookup(
    req: Request,
    upstreamUrl: string,
  ): Promise<Response> {
    const id = crypto.randomUUID();
    const ts = new Date().toISOString();
    const t0 = performance.now();
    const reqUrl = new URL(req.url);
    const incomingPath = reqUrl.pathname + reqUrl.search;
    const outboundHeaders = filterHeaders(req.headers);
    const outboundHeadersArr = headersToArray(outboundHeaders);

    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(upstreamUrl, {
        method: req.method,
        headers: outboundHeaders,
        signal: req.signal,
        decompress: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const errBody = textEncoder.encode(`upstream error: ${message}`);
      this.#recorder.record({
        schemaVersion: 1,
        id,
        ts,
        tsEnd: new Date().toISOString(),
        durationMs: performance.now() - t0,
        kind: "worker-lookup",
        req: {
          method: req.method,
          incomingPath,
          upstreamUrl,
          headers: outboundHeadersArr,
          bodyBase64: "",
          bodyHash: null,
          bodyCanonical: null,
        },
        res: {
          status: 0,
          statusText: "",
          headers: [],
          contentEncoding: null,
          bodyBase64: toBase64(errBody),
          bodyTruncated: false,
          bodyTruncatedAt: null,
        },
        proxyError: message,
        meta: { blockRange: null, workerUrl: null, height: null },
      });
      return new Response(errBody, {
        status: 502,
        headers: { "content-type": "text/plain" },
      });
    }

    const responseHeaders = filterHeaders(upstreamRes.headers);
    const contentEncoding = upstreamRes.headers.get("content-encoding");
    const bodyBytes = new Uint8Array(await upstreamRes.arrayBuffer());

    let textBytes = bodyBytes;
    if (contentEncoding === "gzip") {
      textBytes = Bun.gunzipSync(bodyBytes);
    } else if (contentEncoding === "deflate") {
      textBytes = Bun.inflateSync(bodyBytes);
    }

    let responseBody: string | Uint8Array<ArrayBuffer>;
    let responseInitHeaders: Headers;
    if (upstreamRes.ok) {
      const upstreamWorkerUrl = textDecoder.decode(textBytes).trim();
      const rewritten = `${this.#externalBaseUrl}/_worker/${encodeWorkerToken(upstreamWorkerUrl)}`;
      responseBody = rewritten;
      responseInitHeaders = filterHeaders(upstreamRes.headers);
      responseInitHeaders.delete("content-encoding");
      responseInitHeaders.delete("content-length");
    } else {
      responseBody = bodyBytes;
      responseInitHeaders = responseHeaders;
    }

    this.#recorder.record({
      schemaVersion: 1,
      id,
      ts,
      tsEnd: new Date().toISOString(),
      durationMs: performance.now() - t0,
      kind: "worker-lookup",
      req: {
        method: req.method,
        incomingPath,
        upstreamUrl,
        headers: outboundHeadersArr,
        bodyBase64: "",
        bodyHash: null,
        bodyCanonical: null,
      },
      res: {
        status: upstreamRes.status,
        statusText: upstreamRes.statusText,
        headers: headersToArray(responseHeaders),
        contentEncoding,
        bodyBase64: toBase64(bodyBytes),
        bodyTruncated: false,
        bodyTruncatedAt: null,
      },
      proxyError: null,
      meta: extractMeta("worker-lookup", EMPTY_BYTES, textBytes),
    });

    return new Response(responseBody, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: responseInitHeaders,
    });
  }
}
