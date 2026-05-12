import { Data, Effect } from "effect";

export class InvalidWorkerToken extends Data.TaggedError("InvalidWorkerToken")<{
  cause: unknown;
}> {}

// Base64url so tokens are URL-safe and self-describing — no in-memory state needed.
export function encodeWorkerToken(upstreamUrl: string): string {
  return Buffer.from(upstreamUrl, "utf8").toString("base64url");
}

export const decodeWorkerToken = (
  token: string,
): Effect.Effect<URL, InvalidWorkerToken> =>
  Effect.try({
    try: () => new URL(Buffer.from(token, "base64url").toString("utf8")),
    catch: (cause) => new InvalidWorkerToken({ cause }),
  });
