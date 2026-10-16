import { m } from "@/i18n/messages";
import type { FeedbackRoleFilter } from "@/lib/universal/feedback";
import type { FeedbackRating, FeedbackRole } from "@apollo/database/web/types";
import {
  IconCircleDot,
  IconCircleMinus,
  IconCirclePlus,
  type Icon as TablerIcon,
} from "@tabler/icons-react";

// each rating's icon and the colours it is drawn in
export const ratingStyles = {
  positive: {
    icon: IconCirclePlus,
    label: m.feedback_rating_positive,
    text: "text-teal-700 dark:text-teal-500",
    checked:
      "has-data-checked:border-teal-700 has-data-checked:bg-teal-500/8 dark:has-data-checked:border-teal-500 dark:has-data-checked:bg-teal-500/8",
  },
  neutral: {
    icon: IconCircleDot,
    label: m.feedback_rating_neutral,
    text: "text-muted-foreground",
    checked:
      "has-data-checked:border-muted-foreground has-data-checked:bg-muted/60 dark:has-data-checked:bg-muted/60",
  },
  negative: {
    icon: IconCircleMinus,
    label: m.feedback_rating_negative,
    text: "text-red-700 dark:text-destructive",
    checked:
      "has-data-checked:border-red-700 has-data-checked:bg-destructive/8 dark:has-data-checked:border-destructive dark:has-data-checked:bg-destructive/8",
  },
} satisfies Record<
  FeedbackRating,
  {
    icon: TablerIcon;
    label: () => string;
    text: string;
    checked: string;
  }
>;

/**
 * The colour a share positive draws in: the positive one from 90%, which
 * most traders hold, and the surrounding text's below it, so a low or 0%
 * share never reads as good.
 */
export function percentStyle(percent: number) {
  return percent >= 0.9 ? ratingStyles.positive.text : undefined;
}

// a rater's role as the feedback dialog names it, "you were the trader"
export const roleLabels = {
  buyer: m.feedback_role_buyer,
  seller: m.feedback_role_seller,
  trader: m.feedback_role_trader,
} satisfies Record<FeedbackRole, () => string>;

// the role a profile was rated in, as its feedback page names it, "As seller"
export const ratedRoleLabels = {
  all: m.feedback_page_role_all,
  seller: m.feedback_page_role_seller,
  buyer: m.feedback_page_role_buyer,
  trader: m.feedback_page_role_trader,
} satisfies Record<FeedbackRoleFilter, () => string>;
