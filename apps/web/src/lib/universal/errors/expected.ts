/**
 * A domain error representing an expected, user-facing failure (validation,
 * auth, ownership, control-flow) rather than a bug. Thrown with a stable code
 * as its message, filtered from Sentry and surfaced to users via i18n.
 */
export class ExpectedError extends Error {
  readonly expected = true;
  constructor(message: string) {
    super(message);
    this.name = "ExpectedError";
  }
}

/**
 * Duck-typed marker check, robust to the preload-vs-bundle class duplication
 * that breaks `instanceof` (instrument.ts runs raw TS; server fns run bundled).
 */
export function isExpectedError(value: unknown): boolean {
  return (
    value instanceof Error && "expected" in value && value.expected === true
  );
}
