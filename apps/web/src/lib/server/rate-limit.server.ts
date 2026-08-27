import { Runtime } from "@/lib/server/runtime.server";
import { ExpectedError } from "@/lib/universal/errors/expected";
import { Cause, type Duration, Exit } from "effect";
import { RateLimiter } from "effect/unstable/persistence";

/**
 * Consume one request from a fixed-window rate limit, throwing
 * `ExpectedError("rate_limited")` once the window is exhausted.
 * Store failures are genuine errors and propagate as-is.
 */
export async function consumeRateLimit(options: {
  key: string;
  limit: number;
  window: Duration.Input;
}): Promise<void> {
  const exit = await Runtime.runPromiseExit(
    RateLimiter.RateLimiter.use((limiter) => limiter.consume(options)),
  );

  if (Exit.isSuccess(exit)) {
    return;
  }

  const error = Cause.squash(exit.cause);
  if (
    error instanceof RateLimiter.RateLimiterError &&
    error.reason._tag === "RateLimitExceeded"
  ) {
    throw new ExpectedError("rate_limited");
  }
  throw error instanceof Error ? error : new Error(String(error));
}
