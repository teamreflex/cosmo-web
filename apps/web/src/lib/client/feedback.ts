import { m } from "@/i18n/messages";
import { formatCount } from "@/lib/client/trade-listings";
import type { FeedbackRoleFilter } from "@/lib/universal/feedback";
import type { FeedbackRating, FeedbackRole } from "@apollo/database/web/types";
import type { ListingType } from "@apollo/trades/listing";
import {
  type Icon as TablerIcon,
  IconCircleDot,
  IconCircleMinus,
  IconCirclePlus,
} from "@tabler/icons-react";

/**
 * Each rating's icon and the colours it is drawn in. The bar fills differ in
 * lightness as well as hue, so the three shares stay apart without colour.
 */
export const ratingStyles = {
  positive: {
    icon: IconCirclePlus,
    label: m.feedback_rating_positive,
    text: "text-teal-700 dark:text-teal-500",
    bar: "bg-teal-600 dark:bg-teal-300",
    checked:
      "has-data-checked:border-teal-700 has-data-checked:bg-teal-500/8 dark:has-data-checked:border-teal-500 dark:has-data-checked:bg-teal-500/8",
  },
  neutral: {
    icon: IconCircleDot,
    label: m.feedback_rating_neutral,
    text: "text-muted-foreground",
    bar: "bg-muted-foreground/50",
    checked:
      "has-data-checked:border-muted-foreground has-data-checked:bg-muted/60 dark:has-data-checked:bg-muted/60",
  },
  negative: {
    icon: IconCircleMinus,
    label: m.feedback_rating_negative,
    text: "text-destructive",
    bar: "bg-destructive",
    checked:
      "has-data-checked:border-destructive has-data-checked:bg-destructive/8",
  },
} satisfies Record<
  FeedbackRating,
  {
    icon: TablerIcon;
    label: () => string;
    text: string;
    // the fill of its share of the feedback page's rating bar
    bar: string;
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

// the role a profile was rated in, as its feedback page tags a rating, "As seller"
export const ratedRoleLabels = {
  all: m.feedback_page_role_all,
  seller: m.feedback_page_role_seller,
  buyer: m.feedback_page_role_buyer,
  trader: m.feedback_page_role_trader,
} satisfies Record<FeedbackRoleFilter, () => string>;

// the listing type each role trades in, whose badge colour its tag takes
export const roleListingTypes = {
  buyer: "buy",
  seller: "sell",
  trader: "trade",
} satisfies Record<FeedbackRole, ListingType>;

// the role a profile was rated in, as the feedback page's role filter names it
export const roleNames = {
  buyer: m.feedback_page_role_name_buyer,
  seller: m.feedback_page_role_name_seller,
  trader: m.feedback_page_role_name_trader,
} satisfies Record<FeedbackRole, () => string>;

/**
 * A score's sign and digits. The sign is a real minus, "−4" rather than
 * "-4", which mono text sets in the body font so it sits with the digits.
 */
export function formatScore(score: number) {
  return { sign: score < 0 ? "−" : "", digits: formatCount(Math.abs(score)) };
}
