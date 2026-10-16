import { feedbackRatings } from "@apollo/database/web/types";
import { isAddress, textLength } from "@apollo/util";
import * as z from "zod";
import {
  FEEDBACK_TEXT_MAX,
  feedbackRatingFilters,
  feedbackRoleFilters,
  normalizeFeedbackText,
} from "../feedback";

/**
 * A rating's comment, which may be left out or null, normalized before it
 * is checked, so the length is the stored text's. Postgres only stores
 * well-formed UTF-16. One that normalizes to nothing, as one that shows
 * nothing does, is stored as null.
 */
const feedbackCommentSchema = z
  .string()
  .transform(normalizeFeedbackText)
  .refine((text) => text.isWellFormed())
  .refine((text) => textLength(text) <= FEEDBACK_TEXT_MAX, {
    message: `Keep it to ${FEEDBACK_TEXT_MAX} characters`,
  })
  .nullish()
  .transform((text) => text || null);

// an optional 1 to 5 star rating
const starsSchema = z.int().min(1).max(5).nullish();

export const leaveFeedbackSchema = z.object({
  tradeId: z.uuid(),
  rating: z.enum(feedbackRatings, { error: "Pick how it went" }),
  comment: feedbackCommentSchema,
  communication: starsSchema,
  speed: starsSchema,
});

/**
 * A moderator removing a rating, from the report they acted on when there
 * is one.
 */
export const removeFeedbackSchema = z.object({
  feedbackId: z.uuid(),
  reportId: z.uuid().optional(),
});

export const feedbackSummaryInputSchema = z.object({
  address: z.string().refine(isAddress),
});

/**
 * One page of an address's visible feedback, after the rating `cursor`
 * names, narrowed to the role the address was rated in and the rating.
 */
export const feedbackEntriesInputSchema = z.object({
  address: z.string().refine(isAddress),
  role: z.enum(feedbackRoleFilters),
  rating: z.enum(feedbackRatingFilters),
  cursor: z.uuid().optional(),
});
