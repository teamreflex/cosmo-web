import type { FeedbackEntryView } from "@/lib/universal/feedback";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import RatingIcon from "./rating-icon";

type Props = {
  entry: Pick<FeedbackEntryView, "rating"> & {
    removed?: boolean;
  };
  as?: "article" | "blockquote";
  className?: string;
  /** the comment and anything around it */
  children: ReactNode;
};

/**
 * A rating's sign beside its details. The sign dims once a moderator
 * removed the rating.
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
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">{children}</div>
    </Element>
  );
}
