import { ratingStyles } from "@/lib/client/feedback";
import type { FeedbackSummary } from "@/lib/universal/feedback";
import { cn } from "@/lib/utils";
import { feedbackRatings } from "@apollo/database/web/types";

/**
 * Each rating's share of an address's ratings as a segment of one bar. A
 * rating nobody left has no segment, and the smallest share stays visible.
 */
export default function RatingShareBar({
  counts,
  className,
}: {
  counts: FeedbackSummary["counts"];
  className?: string;
}) {
  return (
    <div aria-hidden className={cn("flex gap-0.5 overflow-hidden", className)}>
      {feedbackRatings
        .filter((rating) => counts[rating] > 0)
        .map((rating) => (
          <span
            key={rating}
            className={cn("min-w-1", ratingStyles[rating].bar)}
            style={{ flexGrow: counts[rating] }}
          />
        ))}
    </div>
  );
}
