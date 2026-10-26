export const feedbackErrorCodes = [
  "feedback_not_eligible",
  "feedback_window_closed",
  "feedback_already_left",
  "feedback_not_found",
] as const;

export type FeedbackErrorCode = (typeof feedbackErrorCodes)[number];

/**
 * Narrows an arbitrary string to a known feedback error code.
 */
export function isFeedbackErrorCode(value: string): value is FeedbackErrorCode {
  return feedbackErrorCodes.some((code) => code === value);
}
