# Errors

How `apps/web` throws, shows and reports errors.

## Two kinds of error

- **Expected:** a user-facing refusal such as validation, auth, ownership or a lost race. Throw `ExpectedError` from `lib/universal/errors/expected.ts` with a stable code as the message. Sentry drops it and the client shows a translated message.
- **Genuine failure:** a bug or a broken dependency, such as an insert that returned nothing. Throw a plain `Error`, which Sentry reports and the client sees only as an unknown error.
- Never put a human sentence in an `ExpectedError`; the message is the code.

## Life of an ExpectedError

```
  server fn or function middleware
    throw new ExpectedError("code", data?)            throw new Error(...), a failed query
        |  expected = true, message = code                  |
        v                                                    v
  instrument.ts beforeSend (@sentry/bun)               reported to Sentry with its stack
    drops isExpectedError, notFound(), 3xx redirects        |
        |                                                    v
        |  expectedErrorSerializationAdapter           errorMaskingMiddleware (start.ts)
        |  (errors/serialization.ts, registered          throws a MaskedError in its place:
        |  in start.ts) keeps the class and data         "Internal server error", cause = original
        |                                                    |
        v                                                    v
  client: an ExpectedError with message = code         client: an Error with that message only
  and data                                               formatError() -> m.error_unknown()
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
- Start sends the `message` of anything a server function throws to its caller, and a Drizzle query error's message is the SQL. `errorMaskingMiddleware` (`lib/server/middlewares.ts`) therefore replaces every thrown value except an `ExpectedError`, a `redirect()` and a `notFound()` with a `MaskedError` (`lib/universal/errors/masked.ts`), for browser calls and in-process calls alike.
- It is the first entry of `functionMiddleware` in `start.ts`, which makes it the outermost: Sentry's function middleware catches the original inside it and rethrows.
- The global chain runs once per server function, so a function called from another function or from an API route hands its caller a `MaskedError`. The middleware passes one through untouched and `instrument.ts` drops it by its `masked` marker (`isMaskedError()`), because Sentry only de-duplicates the same error object and would send the stand-in as a second event.
- The middleware logs the original with `console.error` only when `VITE_SENTRY_DSN` is unset, where the log is the failure's only trace.
- A server function's validator runs inside the chain, so a failed input reaches the client as the masked error, not as Zod issues. Whatever the client must tell apart is an `ExpectedError`.
- Only server functions are masked. A throw from a loader's own code or from request middleware keeps its message, so work that can fail belongs in a server function.
- The Sentry filters test the `expected` and `masked` markers through `isExpectedError()` and `isMaskedError()`, never `instanceof`. `instrument.ts` is preloaded as raw TS while server functions run bundled, so there are two copies of each class.
- `instrument.ts` and its imports run as source, outside the bundle. Keep `expected.ts` and `masked.ts` free of imports so nothing beyond `lib/universal/errors/` is needed at run time.
- `lib/universal/errors/sentry-noise.ts` holds the client's `ignoreErrors` and `denyUrls`: webview bridges, extensions, aborts and chunk errors from a client older than the running build.

## Codes and display

- Each domain has a registry in `lib/universal/errors/<domain>.ts`: a `const` code array, its union type and an `isXErrorCode()` guard.
- Each domain has a formatter in `lib/client/errors/<domain>.ts`: a `switch` from code to `m.*()` ending in `code satisfies never`.
- `formatError(error, ctx?)` in `lib/client/errors/index.ts` passes `error.message` through every formatter and shows `m.error_unknown()` when none knows it. Never render `error.message` directly.
- Browser code that wants its own message shown throws a `LocalizedError` (`lib/client/errors/localized.ts`), the one error whose message `formatError()` shows as it is. The auth forms throw one around `getAuthErrorMessage()`, which translates the Better Auth codes it knows and passes any other response's text through.
- `formatError()` takes an `Error`, which a mutation's `onError` already has. An `ErrorBoundary` hands its fallback an `unknown`, so narrow it with `isExpectedError()` or `instanceof Error` first.
- The `ExpectedError` constructor takes any string, so an unregistered code compiles and shows users the unknown-error message.
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
