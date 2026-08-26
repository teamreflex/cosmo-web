# Testing

Tests run with `bun test` via `turbo test`.

## Rejection assertions are synchronous

In bun:test, `expect(promise).rejects.toX()` returns `void` and blocks synchronously — Bun drains the event loop until the promise settles, so a failing matcher fails the test without `await`, and assertions on the following lines see post-settlement state (e.g. request recorder captures). This differs from vitest/jest.

Never write `await expect(...).rejects...`: the typed return is `void`, so the `await` trips the type-aware `await-thenable` lint error (and TS hint 80007).

## Mocking cosmo endpoints

`packages/cosmo`'s suite mocks at the Effect `HttpClient` layer via `tests/test-client.ts`: an `HttpClient.make` runner with a handler map keyed by method+origin+pathname, a request recorder, and a `runTest` helper mirroring `runCosmo`'s squash semantics. There is no fetch monkey-patching or module mocking (the anti-slop lint bans module mocks).

- Register handlers with `handle.get`/`handle.post`; unhandled routes fail loudly.
- Assert request shape via `recorder()` captures.
- Assert on error shape, not error class identity.
- Known limits: `runCosmo` itself and the `FetchHttpClient` transport are not exercised, and transport-error retry behavior can't be simulated without extending the test client.
