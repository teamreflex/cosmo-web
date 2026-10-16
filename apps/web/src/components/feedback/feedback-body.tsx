import type { FeedbackEntryView } from "@/lib/universal/feedback";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import RatingIcon from "./rating-icon";
import { FeedbackStars } from "./star-rating";

type Props = {
  entry: Pick<FeedbackEntryView, "rating" | "communication" | "speed"> & {
    removed?: boolean;
  };
  as?: "article" | "blockquote";
  className?: string;
  /** what reads above the stars: the comment and anything around it */
  children: ReactNode;
};

/**
 * A rating's sign beside its details, which end in its stars. The sign dims
 * once a moderator removed the rating.
 */
export default function FeedbackBody({
  entry,
  as: Element = "article",
  className,
  children,
}: Props) {
  return (
    <Element className={cn("flex gap-3", className)}>
      <RatingIcon
        rating={entry.rating}
        className={cn(entry.removed && "opacity-50")}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {children}
        <FeedbackStars
          communication={entry.communication}
          speed={entry.speed}
        />
      </div>
    </Element>
  );
}
