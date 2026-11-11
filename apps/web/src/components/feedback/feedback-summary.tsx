import { m } from "@/i18n/messages";
import { getLocale } from "@/i18n/runtime";
import { formatScore, percentStyle, ratingStyles } from "@/lib/client/feedback";
import { formatCount } from "@/lib/client/trade-listings";
import {
  type FeedbackSummary as Summary,
  formatPercentPositive,
} from "@/lib/universal/feedback";
import { cn } from "@/lib/utils";
import {
  type FeedbackRating,
  feedbackRatings,
} from "@apollo/database/web/types";
import type { PropsWithChildren } from "react";

const eyebrow =
  "text-xxs font-medium tracking-widest text-muted-foreground uppercase";

/**
 * The top of the feedback page: the score with the share positive, and how
 * many of each rating the address received. Panels sit side by side from md
 * and stack on phones.
 */
export default function FeedbackSummary({ summary }: { summary: Summary }) {
  const locale = getLocale();
  const score = formatScore(summary.score);

  return (
    <div className="flex flex-col gap-3.5 md:flex-row md:flex-wrap md:items-stretch">
      <Panel className="flex flex-col gap-1.5 p-4 md:flex-[1_1_240px] md:p-4.5">
        <span className={eyebrow}>{m.feedback_page_score()}</span>
        <span className="font-mono text-4xl leading-tight font-bold tabular-nums">
          <span className="font-sans">{score.sign}</span>
          {score.digits}
        </span>
        {summary.percent === null ? (
          <span className="text-sm text-muted-foreground">
            {m.feedback_page_percent_none()}
          </span>
        ) : (
          <span
            className={cn(
              "text-sm tabular-nums",
              percentStyle(summary.percent),
            )}
          >
            {m.feedback_badge_positive({
              percent: formatPercentPositive(summary.percent, locale),
            })}
          </span>
        )}
      </Panel>

      <Panel className="flex flex-col gap-2.5 p-4 md:flex-[1_1_240px] md:p-4.5">
        <span className={eyebrow}>{m.feedback_page_ratings()}</span>
        {feedbackRatings.map((rating) => (
          <div key={rating} className="flex justify-between gap-3 text-sm">
            <RatingLabel rating={rating} />
            <span className="font-mono tabular-nums">
              {formatCount(summary.counts[rating])}
            </span>
          </div>
        ))}
      </Panel>
    </div>
  );
}

function Panel({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-lg border border-border bg-card",
        className,
      )}
    >
      {children}
    </section>
  );
}

function RatingLabel({ rating }: { rating: FeedbackRating }) {
  const style = ratingStyles[rating];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 font-medium", style.text)}
    >
      <style.icon aria-hidden className="size-4 shrink-0" />
      {style.label()}
    </span>
  );
}
