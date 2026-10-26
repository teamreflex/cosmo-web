/**
 * Plain values an expected error carries beside its code, such as the token
 * a refusal names. They cross to the client as they are, where each domain
 * parses them before reading them.
 */
export type ExpectedErrorData = Readonly<
  Record<string, string | number | boolean | null>
>;

/**
 * A domain error representing an expected, user-facing failure (validation,
 * auth, ownership, control-flow) rather than a bug. Thrown with a stable code
 * as its message, filtered from Sentry and surfaced to users via i18n.
 */
export class ExpectedError extends Error {
  readonly expected = true;
  readonly data: ExpectedErrorData | undefined;
  constructor(message: string, data?: ExpectedErrorData) {
    super(message);
    this.name = "ExpectedError";
    this.data = data;
  }
}

/**
 * Duck-typed marker check, robust to the preload-vs-bundle class duplication
 * that breaks `instanceof` (instrument.ts runs raw TS; server fns run bundled).
 */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- boundary predicate; thrown values are genuinely unknown
export function isExpectedError(value: unknown): boolean {
  return (
    value instanceof Error && "expected" in value && value.expected === true
  );
}
