import { m } from "@/i18n/messages";
import { isFeedbackErrorCode } from "@/lib/universal/errors/feedback";

/**
 * Maps a feedback error code to a localized message, or null when the error
 * is not a known feedback error code.
 */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- boundary parser; caught errors are genuinely unknown
export function formatFeedbackError(error: unknown): string | null {
  if (!(error instanceof Error) || !isFeedbackErrorCode(error.message)) {
    return null;
  }

  switch (error.message) {
    case "feedback_not_eligible":
      return m.feedback_error_feedback_not_eligible();
    case "feedback_window_closed":
      return m.feedback_error_feedback_window_closed();
    case "feedback_already_left":
      return m.feedback_error_feedback_already_left();
    case "feedback_not_found":
      return m.feedback_error_feedback_not_found();
    default:
      error.message satisfies never;
      return null;
  }
}
