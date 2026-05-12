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
const BLOCK_NUMBER_KEYS = new Set(["fromBlock", "toBlock"]);

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

// Produces a deterministic serialization of the body so semantically-identical
// requests hash to the same key regardless of cosmetic ordering differences.
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

// Returns canonical form + sha256 hex, or nulls if the body isn't valid JSON.
// Empty bodies (zero-length) also return nulls — they aren't eligible for hash matching.
export function canonicalize(
  bytes: Uint8Array,
): { canonical: string; hash: string } | { canonical: null; hash: null } {
  if (bytes.length === 0) return { canonical: null, hash: null };
  let parsed: Json;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes)) as Json;
  } catch {
    return { canonical: null, hash: null };
  }
  const normalized = normalize(parsed, null);
  const canonical = JSON.stringify(normalized);
  const hash = createHash("sha256").update(canonical, "utf8").digest("hex");
  return { canonical, hash };
}
