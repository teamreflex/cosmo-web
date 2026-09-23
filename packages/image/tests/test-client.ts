import { afterEach } from "bun:test";
import { Cause, Effect, Exit, ManagedRuntime } from "effect";
import { HttpClient, HttpClientResponse } from "effect/unstable/http";

export type CapturedRequest = {
  readonly method: string;
  readonly url: URL;
  readonly contentType: string | undefined;
};

type Handler = (request: CapturedRequest) => Response;

/**
 * Handlers are keyed by method + origin + pathname, so presigned query strings
 * are ignored. Every request is recorded in order; unhandled requests die with
 * a defect naming the method and URL.
 */
const handlers = new Map<string, Handler>();
export const requests: CapturedRequest[] = [];

afterEach(() => {
  handlers.clear();
  requests.length = 0;
});

export function handle(method: string, url: string, handler: Handler) {
  const parsed = new URL(url);
  handlers.set(`${method} ${parsed.origin}${parsed.pathname}`, handler);
}

const client = HttpClient.make((request, url) => {
  const handler = handlers.get(
    `${request.method} ${url.origin}${url.pathname}`,
  );
  if (handler === undefined) {
    return Effect.die(
      new Error(`unhandled request: ${request.method} ${url.href}`),
    );
  }

  const captured = {
    method: request.method,
    url,
    contentType: request.headers["content-type"],
  };
  requests.push(captured);
  return Effect.succeed(HttpClientResponse.fromWeb(request, handler(captured)));
});

const runtime = ManagedRuntime.make(
  HttpClient.layerMergedContext(Effect.succeed(client)),
);

/**
 * Mirrors `runImage` (runPromiseExit + Cause.squash) so rejections carry the
 * original tagged error instance.
 */
export async function runTest<A, E>(
  effect: Effect.Effect<A, E, HttpClient.HttpClient>,
): Promise<A> {
  const exit = await runtime.runPromiseExit(effect);
  if (Exit.isSuccess(exit)) {
    return exit.value;
  }

  const error = Cause.squash(exit.cause);
  throw error instanceof Error ? error : new Error(String(error));
}
