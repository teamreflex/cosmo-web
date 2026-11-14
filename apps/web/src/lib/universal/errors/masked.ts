/**
 * What a server function's genuine failure becomes before it leaves the
 * function: a fixed message, with the original as its cause. The original
 * has already been reported, so Sentry drops this stand-in.
 */
export class MaskedError extends Error {
  readonly masked = true;
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- wraps a thrown value, which is genuinely unknown
  constructor(cause: unknown) {
    super("Internal server error", { cause });
    this.name = "MaskedError";
  }
}

/**
 * Duck-typed marker check, for the same reason as `isExpectedError()`:
 * instrument.ts and the server bundle each hold a copy of the class.
 */
export function isMaskedError(
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- boundary predicate; thrown values are genuinely unknown
  value: unknown,
): value is MaskedError {
  return value instanceof Error && "masked" in value && value.masked === true;
}
