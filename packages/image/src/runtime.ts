import { Cause, type Effect, Exit, ManagedRuntime } from "effect";
import { FetchHttpClient, type HttpClient } from "effect/unstable/http";

const runtime = ManagedRuntime.make(FetchHttpClient.layer);

/**
 * Run an image effect as a promise, for callers without an Effect runtime
 * (`apps/indexer`). Failures are the package's tagged errors; runPromiseExit
 * is used so the original error instance is thrown rather than a FiberFailure
 * wrapper.
 */
export async function runImage<A, E>(
  effect: Effect.Effect<A, E, HttpClient.HttpClient>,
  signal: AbortSignal | null = null,
): Promise<A> {
  const exit = await runtime.runPromiseExit(effect, {
    signal: signal ?? undefined,
  });
  if (Exit.isSuccess(exit)) {
    return exit.value;
  }

  const error = Cause.squash(exit.cause);
  throw error instanceof Error ? error : new Error(String(error));
}
