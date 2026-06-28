# Error Handling

## Route-Level Errors

```tsx
export const Route = createFileRoute("/path")({
  errorComponent: ErrorComponent,
  notFoundComponent: NotFoundComponent,
});

function ErrorComponent() {
  return (
    <div className="flex h-dvh items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold">{m.error_something_wrong()}</h2>
        <p className="text-sm text-muted-foreground">
          {m.error_something_wrong_description()}
        </p>
        <Button onClick={() => window.location.reload()}>
          {m.error_reload()}
        </Button>
      </div>
    </div>
  );
}
```

## Component-Level Errors

```tsx
import { ErrorBoundary } from "react-error-boundary";

<ErrorBoundary fallback={<ErrorFallback />}>
  <Suspense fallback={<LoadingSkeleton />}>
    <AsyncComponent />
  </Suspense>
</ErrorBoundary>;
```

## Mutation Error Handling

```tsx
mutation.mutate(data, {
  onSuccess: () => {
    toast.success("Success!");
    router.invalidate();
  },
  onError: (error) => {
    toast.error(formatError(error));
  },
});
```

## Expected Errors, Codes & Sentry Filtering

Thrown errors fall into two categories:

- **Genuine failures** (a DB insert returned nothing, an upstream call broke unexpectedly): throw a plain `Error`. These are reported to Sentry.
- **Expected/domain errors** (validation, auth, ownership, control-flow — user-facing outcomes, not bugs): throw `ExpectedError` from `lib/universal/errors/expected.ts` with a **stable code** as the message. These are filtered out of Sentry and shown to the user via i18n.

```ts
import { ExpectedError } from "@/lib/universal/errors/expected";
// in a server fn / middleware
throw new ExpectedError("list_name_taken");
```

**Codes are typed per domain** in `lib/universal/errors/{lists,auth,gravity}.ts` — a `const` code array, a `ListErrorCode`-style union, and an `isXErrorCode()` guard. Never throw a raw human sentence; add a code.

**Display:** never render `error.message` directly. Each domain has a client formatter in `lib/client/errors/{lists,auth,gravity}.ts` mapping codes → `m.*()` strings; `formatError(error, ctx?)` in `lib/client/errors/index.ts` dispatches across all domains and falls back to the raw message for genuine errors. Mutation `onError` uses `toast.error(formatError(error))`. Every domain gets its own formatter for consistency, even single-code ones like gravity.

**Sentry filtering is two-pronged** — there are two separate SDKs, split by runtime, so each needs its own filter:

- Server (`@sentry/bun`, `instrument.ts`): `beforeSend` drops anything where `isExpectedError()` holds — matched by the inherited `expected` marker property, **not** `instanceof` (the `--preload` runs raw TS while server fns run bundled, so they hold separate class copies). This catches every server-thrown expected error with no per-code maintenance.
- Client (`@sentry/tanstackstart-react`, `router.tsx`): `beforeSend` drops `isExpectedError()` too — symmetric with the server. By default TanStack's `ShallowErrorPlugin` would reduce every error crossing the server→client boundary to `new Error(message)` (dropping the class/marker), so an `ExpectedError` **serialization adapter** registered in `createStart` (`lib/universal/errors/serialization.ts`) preserves it as a real instance. Codes remain the throw vocabulary for i18n display, not for filtering.

**Adding a new expected error:** add the code to its domain registry, add an i18n string + a formatter `case`, then `throw new ExpectedError(code)`. Both Sentry filters work off the marker automatically; only display — the formatter `case` + i18n string — needs wiring.
