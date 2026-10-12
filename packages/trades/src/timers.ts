/**
 * Whether a live trade's deadline has passed, judged against the drain's
 * chain-time watermark rather than the clock. A transfer stamped before the
 * deadline but drained after it still counts, because the watermark only
 * reaches the deadline once that transfer has been drained. With no
 * watermark yet, nothing times out.
 */
export function isTimedOut(deadline: Date, watermark: Date | null) {
  return watermark !== null && deadline.getTime() <= watermark.getTime();
}

// how long a claimed listing's trade has to complete; posters can't change it
export const CLAIM_WINDOW = 48 * 60 * 60 * 1000;

// the drain's row in `list_drain_cursor`, whose `chain_time` is the watermark
export const DRAIN_CURSOR_NAME = "outbox-drain";

// the new deadlines staff can give a disputed trade, in hours
export const EXTEND_HOURS = [24, 48, 72] as const;

/**
 * The deadline a disputed trade gets when staff extend it: the time it had
 * left when it was frozen, never less than none, plus the extension.
 */
export function extendedDeadline(
  deadline: Date,
  frozenAt: Date,
  now: Date,
  hours: (typeof EXTEND_HOURS)[number],
) {
  return new Date(
    now.getTime() +
      Math.max(0, deadline.getTime() - frozenAt.getTime()) +
      hours * 60 * 60 * 1000,
  );
}
