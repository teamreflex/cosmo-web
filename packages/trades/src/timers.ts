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
