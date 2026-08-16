import {
  FetchHttpClient,
  type HttpClient,
  HttpClientError,
} from "@effect/platform";
import { Cause, type Effect, Exit, ManagedRuntime, ParseResult } from "effect";
import { CosmoApiError, CosmoDecodeError } from "./errors.js";

const runtime = ManagedRuntime.make(FetchHttpClient.layer);

/**
 * Run a COSMO effect as a promise, converting Effect-level failures into the
 * package's public error types so promise callers never see Effect internals.
 * runPromiseExit is used so the original error instance is thrown rather than
 * a FiberFailure wrapper.
 */
export async function runCosmo<A, E>(
  effect: Effect.Effect<A, E, HttpClient.HttpClient>,
  signal: AbortSignal | null,
): Promise<A> {
  const exit = await runtime.runPromiseExit(effect, {
    signal: signal ?? undefined,
  });
  if (Exit.isSuccess(exit)) {
    return exit.value;
  }

  const error = Cause.squash(exit.cause);
  if (error instanceof HttpClientError.ResponseError) {
    throw new CosmoApiError(
      `COSMO responded with status ${error.response.status}`,
      { status: error.response.status, cause: error },
    );
  }
  if (error instanceof HttpClientError.RequestError) {
    throw new CosmoApiError(error.message, { cause: error });
  }
  if (error instanceof ParseResult.ParseError) {
    throw new CosmoDecodeError(error.message, { cause: error });
  }
  throw error;
}
