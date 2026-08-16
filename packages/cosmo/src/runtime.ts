import { FetchHttpClient, type HttpClient } from "@effect/platform";
import { Cause, type Effect, Exit, ManagedRuntime } from "effect";

const runtime = ManagedRuntime.make(FetchHttpClient.layer);

/**
 * Run a COSMO effect as a promise. Failures are already the package's public
 * tagged error types (CosmoApiError, CosmoDecodeError, EncryptionError);
 * runPromiseExit is used so the original error instance is thrown rather than
 * a FiberFailure wrapper.
 */
export async function runCosmo<A, E>(
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
