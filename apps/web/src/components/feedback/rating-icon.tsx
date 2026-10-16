import { ratingStyles } from "@/lib/client/feedback";
import { cn } from "@/lib/utils";
import type { FeedbackRating } from "@apollo/database/web/types";

/**
 * A rating's sign in a circle of its colour, named for screen readers.
 */
export default function RatingIcon({
  rating,
  className,
}: {
  rating: FeedbackRating;
  className?: string;
}) {
  const style = ratingStyles[rating];
  return (
    <style.icon
      role="img"
      aria-label={style.label()}
      className={cn("size-7 shrink-0", style.text, className)}
    />
  );
}
