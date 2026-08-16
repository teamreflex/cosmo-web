import { setupServer } from "msw/node";

/**
 * Shared MSW server. Handlers are registered per-test via `server.use()` and
 * reset between tests by the preload script. Requests to unhandled routes
 * fail the test, so every outgoing request must be pinned by a handler.
 */
export const server = setupServer();

type HeaderAccess = { get(name: string): string | null };

export interface CapturedRequest {
  readonly method: string;
  readonly url: URL;
  readonly headers: HeaderAccess;
  readonly body: string;
}

/**
 * Structural view over a fetch Request, so the recorder accepts both Bun's
 * and MSW's (undici) Request types.
 */
interface RecordableRequest {
  readonly method: string;
  readonly url: string;
  readonly headers: HeaderAccess;
  clone(): { text(): Promise<string> };
}

/**
 * Snapshots requests hitting a handler so tests can assert on method, headers,
 * query params and body after the call under test resolves. `record` must be
 * awaited inside the resolver so the body is captured before assertions run.
 */
export function recorder() {
  const requests: CapturedRequest[] = [];
  return {
    requests,
    async record(request: RecordableRequest) {
      requests.push({
        method: request.method,
        url: new URL(request.url),
        headers: request.headers,
        body: await request.clone().text(),
      });
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
