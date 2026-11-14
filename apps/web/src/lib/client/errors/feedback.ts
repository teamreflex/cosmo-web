import { m } from "@/i18n/messages";
import { isFeedbackErrorCode } from "@/lib/universal/errors/feedback";

/**
 * Maps a feedback error code to a localized message, or null when the code
 * is not a known feedback error code.
 */
export function formatFeedbackError(code: string): string | null {
  if (!isFeedbackErrorCode(code)) {
    return null;
  }

  switch (code) {
    case "feedback_not_eligible":
      return m.feedback_error_feedback_not_eligible();
    case "feedback_window_closed":
      return m.feedback_error_feedback_window_closed();
    case "feedback_already_left":
      return m.feedback_error_feedback_already_left();
    case "feedback_not_found":
      return m.feedback_error_feedback_not_found();
    default:
      code satisfies never;
      return null;
  }
}
