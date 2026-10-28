# Errors

How `apps/web` throws, shows and reports errors.

## Two kinds of error

- **Expected:** a user-facing refusal such as validation, auth, ownership or a lost race. Throw `ExpectedError` from `lib/universal/errors/expected.ts` with a stable code as the message. Sentry drops it and the client shows a translated message.
- **Genuine failure:** a bug or a broken dependency, such as an insert that returned nothing. Throw a plain `Error`, which Sentry reports.
- Never put a human sentence in an `ExpectedError`; the message is the code.

## Life of an ExpectedError

```
  server fn, middleware or loader
    throw new ExpectedError("code", data?)            throw new Error(...)
        |  expected = true, message = code                  |
        v                                                    v
  instrument.ts beforeSend (@sentry/bun)               reported to Sentry
    drops isExpectedError, notFound(), 3xx redirects
        |
        |  expectedErrorSerializationAdapter (errors/serialization.ts, registered
        |  in start.ts) keeps the class and data
        v
  client: an ExpectedError with message = code and data
        |
        +-- mutation onError --> toast.error(formatError(error))
        |                          formatXError(code) -> m.*() in the viewer's locale
        |                          data read only after its domain schema parses it
        |
        +-- loader or render ---> route errorComponent or a component ErrorBoundary
                                  <Error message={m.page_error()} />, or null

  lib/client/sentry.ts beforeSend (client SDK) drops isExpectedError, 90% of "Failed to fetch"
  and "Load failed", events with no in_app frame, and the sentry-noise.ts patterns
```

- Without the serialization adapter, Start reduces every error crossing to the client to `new Error(message)`, losing the marker and `data`.
- Both Sentry filters test the `expected` marker through `isExpectedError()`, never `instanceof`. `instrument.ts` is preloaded as raw TS while server functions run bundled, so there are two copies of the class.
- `instrument.ts` and its imports run as source, outside the bundle. Keep `expected.ts` free of imports so nothing beyond `lib/universal/errors/` is needed at run time.
- `lib/universal/errors/sentry-noise.ts` holds the client's `ignoreErrors` and `denyUrls`: webview bridges, extensions, aborts and chunk errors from a client older than the running build.

## Codes and display

- Each domain has a registry in `lib/universal/errors/<domain>.ts`: a `const` code array, its union type and an `isXErrorCode()` guard.
- Each domain has a formatter in `lib/client/errors/<domain>.ts`: a `switch` from code to `m.*()` ending in `error.message satisfies never`.
- `formatError(error, ctx?)` in `lib/client/errors/index.ts` chains every formatter and falls back to `error.message` for genuine errors. Never render `error.message` directly.
- The `ExpectedError` constructor takes any string, so an unregistered code compiles and shows the raw code to users.
- Components that act on a specific code check it with the guard (`isRateLimitErrorCode`), not a string compare.

## Data beside the code

- Pass plain scalars as the second argument when the client needs more than the code: `throw new ExpectedError("claim_token_unavailable", { tokenId, reason })`.
- `data` reaches the client as sent, so treat its shape as untrusted. The domain registry owns a Zod schema for it (`claimTokenRefusalSchema`).
- The client parses `error.data` with that schema before reading it, and a failed parse falls back to the code alone (`claimFailure()` in `lib/client/errors/trades.ts`).
- The code's own message must read correctly without the data.

## Boundaries

- **Route:** `errorComponent` and `notFoundComponent`. Pages return `<Error message={m.<page>_error()} />` from `components/error-boundary.tsx`, whose button reloads the page. The root route has full-screen variants.
- **Component:** `ErrorBoundary` from `react-error-boundary` around `Suspense`. The fallback is `<Error />`, or `null` for optional UI such as the navbar notice.
- **Mutation:** `onError: (error) => toast.error(formatError(error))`. Code-specific handling (a rate limit, a refused listing claim) branches before the toast.
- Importing `Error` from `components/error-boundary` shadows the global `Error` in that file; use `globalThis.Error` there to throw.
- Signed-out and permission gates throw `redirect()` or `notFound()`, never an error ([tanstack.md](tanstack.md#gating)).

## Adding an expected error

1. Add the code to its domain's registry in `lib/universal/errors/`. For a new domain, create the registry and a formatter, and add the formatter to the chain in `formatError()`.
2. Add a `case` for it in `lib/client/errors/<domain>.ts`.
3. Add the `m.*` string to all six `apps/web/messages/*.json` files ([frontend.md](frontend.md#i18n)).
4. If the client needs more than the code, add a `data` schema to the registry.
5. `throw new ExpectedError("code")`. The Sentry filters need no change.
