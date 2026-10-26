import { m } from "@/i18n/messages";
import { getLocale } from "@/i18n/runtime";
import { percentStyle } from "@/lib/client/feedback";
import { formatCount } from "@/lib/client/trade-listings";
import {
  type FeedbackRep,
  formatPercentPositive,
} from "@/lib/universal/feedback";
import { cn } from "@/lib/utils";

type Props = {
  variant: "compact" | "full";
  rep: FeedbackRep | null;
  /**
   * Below md, `compact` shows the whole percent alone, as MarketA's phone
   * cards show it, and `full` the rating count without "ratings".
   */
  narrow?: boolean;
  className?: string;
};

/**
 * A user's received feedback, never a link.
 * - `compact`: "99.1% · 231", the share positive and every visible rating,
 *   for rows and headers. Nothing before the first rating, never "0%".
 * - `full`: "99.1% positive · 231 ratings", for the poster line and party
 *   cards. "No feedback yet" before the first rating.
 * Both read "3 ratings" while no rating is positive or negative, and only a
 * high share draws in the positive colour.
 */
export default function FeedbackBadge(props: Props) {
  const { rep } = props;
  const locale = getLocale();

  if (props.variant === "compact") {
    if (rep === null) return null;
    const className = cn(
      "text-xs whitespace-nowrap text-muted-foreground tabular-nums",
      props.className,
    );
    if (rep.percent === null) {
      return <span className={className}>{ratings(rep.count)}</span>;
    }
    const percent = formatPercentPositive(rep.percent, locale);
    const compact = m.feedback_badge_compact({
      percent,
      count: formatCount(rep.count),
    });
    return (
      <span
        title={m.feedback_badge_summary({ percent, count: rep.count })}
        className={className}
      >
        {props.narrow ? (
          <>
            <span className="md:hidden">
              {formatPercentPositive(rep.percent, locale, 0)}
            </span>
            <span className="max-md:hidden">{compact}</span>
          </>
        ) : (
          compact
        )}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "text-xs text-muted-foreground tabular-nums",
        props.className,
      )}
    >
      {rep === null ? (
        m.feedback_badge_none()
      ) : rep.percent === null ? (
        ratings(rep.count)
      ) : (
        <>
          <span className={percentStyle(rep.percent)}>
            {m.feedback_badge_positive({
              percent: formatPercentPositive(rep.percent, locale),
            })}
          </span>
          {"\u00a0· "}
          {props.narrow ? (
            <>
              <span className="md:hidden">{formatCount(rep.count)}</span>
              <span className="max-md:hidden">{ratings(rep.count)}</span>
            </>
          ) : (
            ratings(rep.count)
          )}
        </>
      )}
    </span>
  );
}

function ratings(count: number) {
  return m.feedback_badge_ratings({ count, formatted: formatCount(count) });
}
