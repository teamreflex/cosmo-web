import { createHash } from "node:crypto";

const HEX_RE = /^0x[0-9a-f]+$/i;
const FILTER_ARRAY_KEYS = new Set([
  "address",
  "topic0",
  "topic1",
  "topic2",
  "topic3",
  "to",
  "sighash",
  "traceTypes",
]);
const BLOCK_NUMBER_KEYS = new Set(["fromBlock"]); // toBlock excluded — varies with chain head between runs
const RPC_DROP_KEYS = new Set(["id", "jsonrpc"]);

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function normalize(value: Json, parentKey: string | null): Json {
  if (value === null) return null;
  if (Array.isArray(value)) {
    const normalized = value.map((v) => normalize(v, null));
    if (parentKey !== null && FILTER_ARRAY_KEYS.has(parentKey)) {
      normalized.sort((a, b) => {
        const sa = JSON.stringify(a);
        const sb = JSON.stringify(b);
        return sa < sb ? -1 : sa > sb ? 1 : 0;
      });
    }
    return normalized;
  }
  if (typeof value === "object") {
    const out: Record<string, Json> = {};
    const keys = Object.keys(value).sort();
    for (const k of keys) {
      // skip toBlock entirely — chain head varies between record and replay
      if (k === "toBlock") continue;
      out[k] = normalize(value[k] as Json, k);
    }
    return out;
  }
  if (typeof value === "string" && HEX_RE.test(value)) {
    return value.toLowerCase();
  }
  if (
    typeof value === "number" &&
    parentKey !== null &&
    BLOCK_NUMBER_KEYS.has(parentKey)
  ) {
    return String(value);
  }
  return value;
}

function normalizeRpc(value: Json): Json {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return value;
  const out: Record<string, Json> = {};
  const keys = Object.keys(value)
    .filter((k) => !RPC_DROP_KEYS.has(k))
    .sort();
  for (const k of keys) {
    out[k] = normalize(value[k] as Json, k);
  }
  return out;
}

export type Canonicalized =
  | { canonical: string; hash: string }
  | { canonical: null; hash: null };

export function canonicalize(bytes: Uint8Array): Canonicalized {
  if (bytes.length === 0) return { canonical: null, hash: null };
  let parsed: Json;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes)) as Json;
  } catch {
    return { canonical: null, hash: null };
  }
  const canonical = JSON.stringify(normalize(parsed, null));
  const hash = createHash("sha256").update(canonical, "utf8").digest("hex");
  return { canonical, hash };
}

// JSON-RPC body: hash on { method, params } only — id/jsonrpc are per-call sequence.
// For batch requests (array body), each element is canonicalized independently.
export function canonicalizeRpc(bytes: Uint8Array): Canonicalized {
  if (bytes.length === 0) return { canonical: null, hash: null };
  let parsed: Json;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes)) as Json;
  } catch {
    return { canonical: null, hash: null };
  }
  const normalized = Array.isArray(parsed)
    ? parsed.map(normalizeRpc)
    : normalizeRpc(parsed);
  const canonical = JSON.stringify(normalized);
  const hash = createHash("sha256").update(canonical, "utf8").digest("hex");
  return { canonical, hash };
}
