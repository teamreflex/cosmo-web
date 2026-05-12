// Base64url so tokens are URL-safe and self-describing — no in-memory state needed.
export function encodeWorkerToken(upstreamUrl: string): string {
  return Buffer.from(upstreamUrl, "utf8").toString("base64url");
}

export function decodeWorkerToken(token: string): URL {
  return new URL(Buffer.from(token, "base64url").toString("utf8"));
}
