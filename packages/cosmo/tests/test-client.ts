import { afterEach } from "bun:test";
import { Cause, Effect, Exit, ManagedRuntime } from "effect";
import {
  type HttpBody,
  HttpClient,
  type HttpClientRequest,
  HttpClientResponse,
} from "effect/unstable/http";

export interface CapturedRequest {
  readonly method: string;
  readonly url: URL;
  readonly headers: { get(name: string): string | null };
  readonly body: string;
}

type Handler = (request: CapturedRequest) => Response | Promise<Response>;

/**
 * Handlers are registered per-test via `handle.get`/`handle.post` and keyed by
 * method + origin + pathname; query params are ignored for matching. Requests
 * to unhandled routes die with a defect naming the method and URL, so every
 * outgoing request must be pinned by a handler.
 */
const handlers = new Map<string, Handler>();

afterEach(() => handlers.clear());

const register = (method: string, url: string, handler: Handler) => {
  const parsed = new URL(url);
  handlers.set(`${method} ${parsed.origin}${parsed.pathname}`, handler);
};

export const handle = {
  get: (url: string, handler: Handler) => register("GET", url, handler),
  post: (url: string, handler: Handler) => register("POST", url, handler),
};

/**
 * Decode a request body to text. The package only sends empty, JSON and text
 * bodies, all of which the client stores as Uint8Array variants.
 */
function bodyText(body: HttpBody.HttpBody): string {
  switch (body._tag) {
    case "Empty":
      return "";
    case "Uint8Array":
      return new TextDecoder().decode(body.body);
    default:
      throw new Error(`unsupported request body variant: ${body._tag}`);
  }
}

/**
 * Snapshot an HttpClientRequest for assertions: full URL including query
 * params, lowercase header lookup (the body's content-type is already merged
 * into request.headers by setBody), and the body as text.
 */
function capture(
  request: HttpClientRequest.HttpClientRequest,
  url: URL,
): CapturedRequest {
  const headers = request.headers;
  return {
    method: request.method,
    url,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    body: bodyText(request.body),
  };
}

/**
 * Mock HttpClient: dispatches on method + URL to the registered handlers and
 * wraps the returned web Response, so the real retry/timeout/error policy in
 * src/server/http.ts runs on top of it.
 */
const client = HttpClient.make((request, url) => {
  const handler = handlers.get(
    `${request.method} ${url.origin}${url.pathname}`,
  );
  if (handler === undefined) {
    return Effect.die(new Error(`unhandled request: ${request.method} ${url}`));
  }
  const captured = capture(request, url);
  return Effect.map(
    Effect.promise(async () => handler(captured)),
    (response) => HttpClientResponse.fromWeb(request, response),
  );
});

/**
 * Snapshots requests hitting a handler so tests can assert on method, headers,
 * query params and body after the call under test resolves. Call `record`
 * inside the handler with the request it receives.
 */
export function recorder() {
  const requests: CapturedRequest[] = [];
  return {
    requests,
    record(request: CapturedRequest) {
      requests.push(request);
    },
    /** Returns the nth captured request, failing loudly when it's missing. */
    at(index: number): CapturedRequest {
      const request = requests[index];
      if (!request) {
        throw new Error(`no request captured at index ${index}`);
      }
      return request;
    },
  };
}

const runtime = ManagedRuntime.make(
  HttpClient.layerMergedContext(Effect.succeed(client)),
);

/**
 * Run a COSMO effect against the mock client. Mirrors `runCosmo` from
 * src/runtime.ts (runPromiseExit + Cause.squash) so rejection assertions see
 * the original tagged error instance, not a FiberFailure wrapper.
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
