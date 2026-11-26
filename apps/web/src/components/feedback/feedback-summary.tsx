import { m } from "@/i18n/messages";
import { getLocale } from "@/i18n/runtime";
import {
  formatRatings,
  formatScore,
  percentStyle,
  ratingStyles,
  roleNames,
} from "@/lib/client/feedback";
import { formatCount } from "@/lib/client/trade-listings";
import {
  feedbackRatingFilters,
  feedbackRoleFilters,
  type FeedbackSearch,
  type FeedbackSummary as Summary,
  formatPercentPositive,
  ratedRoles,
} from "@/lib/universal/feedback";
import { cn } from "@/lib/utils";
import { feedbackRatings, feedbackRoles } from "@apollo/database/web/types";
import { getRouteApi } from "@tanstack/react-router";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import RatingShareBar from "./rating-share-bar";

const route = getRouteApi("/@{$username}/feedback");

const eyebrow =
  "text-xxs font-medium tracking-widest text-muted-foreground uppercase";

// below this many ratings the bar draws one pip per rating
const PIP_LIMIT = 50;

const filterItem =
  "h-11 gap-1.5 disabled:border-dashed aria-pressed:border-input";

// sets feedback page filters in place of the current history entry, keeping the scroll
function useSetFilter() {
  const navigate = route.useNavigate();
  return (filter: Partial<FeedbackSearch>) =>
    void navigate({
      search: (prev) => ({ ...prev, ...filter }),
      replace: true,
      resetScroll: false,
    });
}

/**
 * The top of the feedback page as one scoreboard: the score with the share
 * positive, the mix of ratings whose counts filter the list by rating, and
 * the roles the address was rated in, which filter it by role. From lg the
 * three sit side by side; below it they stack.
 */
export default function FeedbackSummary({
  summary,
  search,
}: {
  summary: Summary;
  search: FeedbackSearch;
}) {
  const locale = getLocale();
  const score = formatScore(summary.score);

  return (
    <section
      aria-label={m.feedback_page_score()}
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 lg:grid lg:grid-cols-[13.75rem_minmax(0,1fr)_17.5rem] lg:gap-0 lg:p-0"
    >
      <div className="flex items-end justify-between gap-3 lg:flex-col lg:items-start lg:justify-start lg:border-r lg:border-border lg:p-5">
        <div className="flex flex-col gap-2.5">
          <span className={eyebrow}>{m.feedback_page_score()}</span>
          <span className="font-mono text-4xl leading-none font-bold tabular-nums lg:text-[2.75rem]">
            <span className="font-sans">{score.sign}</span>
            {score.digits}
          </span>
        </div>
        {summary.percent === null ? (
          <span className="text-sm text-muted-foreground max-lg:text-right">
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
      </div>

      <RatingFilter summary={summary} value={search.rating} />
      <RoleFilter summary={summary} value={search.role} />
    </section>
  );
}

/**
 * The mix of ratings as a bar, over a button per rating that narrows the
 * list to it. A rating nobody left stays in place, disabled, so the row
 * never shifts.
 */
function RatingFilter({
  summary,
  value,
}: {
  summary: Summary;
  value: FeedbackSearch["rating"];
}) {
  const setFilter = useSetFilter();
  const share = new Intl.NumberFormat(getLocale(), { style: "percent" });
  const pips = summary.total < PIP_LIMIT;

  return (
    <div className="flex flex-col gap-3 lg:border-r lg:border-border lg:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <span className={eyebrow}>{m.feedback_page_rating()}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatRatings(summary.total)}
        </span>
      </div>

      <RatingBar counts={summary.counts} pips={pips} />

      <ToggleGroup
        aria-label={m.feedback_page_rating()}
        variant="outline"
        spacing={1.5}
        value={[value]}
        // pressing the shown rating again keeps it
        onValueChange={([picked]) => {
          const rating = feedbackRatingFilters.find((r) => r === picked);
          if (rating !== undefined) setFilter({ rating });
        }}
        className="grid w-full grid-cols-4 sm:flex sm:flex-wrap"
      >
        <ToggleGroupItem value="all" className={ratingItem}>
          {m.feedback_page_rating_all()}
          <span className="font-mono text-muted-foreground tabular-nums">
            {formatCount(summary.total)}
          </span>
        </ToggleGroupItem>
        {feedbackRatings.map((rating) => {
          const style = ratingStyles[rating];
          const count = summary.counts[rating];
          return (
            <ToggleGroupItem
              key={rating}
              value={rating}
              disabled={count === 0 && value !== rating}
              className={ratingItem}
            >
              <style.icon aria-hidden className={cn(count > 0 && style.text)} />
              <span className="max-sm:sr-only">{style.label()}</span>
              <span className="font-mono tabular-nums">
                {formatCount(count)}
              </span>
              {!pips && (
                <span className="font-mono text-muted-foreground tabular-nums max-sm:hidden">
                  {share.format(count / summary.total)}
                </span>
              )}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}

const ratingItem = cn(filterItem, "sm:h-8 sm:px-2.5");

/**
 * Below PIP_LIMIT ratings one pip per rating, so two ratings read as two
 * rather than as a full bar; from it, each rating's share of the width.
 */
function RatingBar({
  counts,
  pips,
}: {
  counts: Summary["counts"];
  pips: boolean;
}) {
  return pips ? (
    <div aria-hidden className="flex h-3 gap-0.75">
      {feedbackRatings.flatMap((rating) =>
        Array.from({ length: counts[rating] }, (_, i) => (
          <span
            key={`${rating}-${i}`}
            className={cn(
              "max-w-3.5 flex-1 rounded-xs",
              ratingStyles[rating].bar,
            )}
          />
        )),
      )}
    </div>
  ) : (
    <RatingShareBar counts={counts} className="h-3 rounded-sm" />
  );
}

/**
 * The roles the address was rated in. With ratings in more than one role,
 * each is a button that narrows the list to it; with all of them in one,
 * the roles only read out, as there is nothing to narrow. A picked role
 * keeps the buttons, so the page can get back to all.
 */
function RoleFilter({
  summary,
  value,
}: {
  summary: Summary;
  value: FeedbackSearch["role"];
}) {
  const setFilter = useSetFilter();

  if (ratedRoles(summary).length < 2 && value === "all") {
    return (
      <div className="flex flex-col gap-2.5 lg:p-5">
        <span className={eyebrow}>{m.feedback_page_roles()}</span>
        {feedbackRoles.map((role) => {
          const count = summary.roles[role];
          return (
            <div
              key={role}
              className={cn(
                "grid grid-cols-[3.5rem_minmax(0,1fr)_2.5rem] items-center gap-2.5 text-sm",
                count === 0 && "text-muted-foreground",
              )}
            >
              <span>{roleNames[role]()}</span>
              <span
                aria-hidden
                className={cn(
                  "h-1.5 rounded-full",
                  count === 0 ? "bg-muted" : "bg-foreground/80",
                )}
              />
              <span className="text-right font-mono tabular-nums">
                {formatCount(count)}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  const counts = { all: summary.total, ...summary.roles };
  return (
    <div className="flex flex-col gap-2 lg:p-5">
      <span className={eyebrow}>{m.feedback_page_roles()}</span>
      <ToggleGroup
        aria-label={m.feedback_page_roles()}
        variant="outline"
        spacing={1.5}
        value={[value]}
        onValueChange={([picked]) => {
          const role = feedbackRoleFilters.find((r) => r === picked);
          if (role !== undefined) setFilter({ role });
        }}
        className="grid w-full grid-cols-4 lg:flex lg:flex-col lg:items-stretch lg:gap-1"
      >
        {feedbackRoleFilters.map((role) => (
          <ToggleGroupItem
            key={role}
            value={role}
            disabled={counts[role] === 0 && value !== role}
            className={cn(
              filterItem,
              "lg:h-7 lg:justify-between lg:border-transparent lg:px-2 lg:disabled:border-transparent",
            )}
          >
            {roleNames[role]()}
            <span
              className={cn(
                "font-mono tabular-nums",
                role === "all" && "text-muted-foreground",
              )}
            >
              {formatCount(counts[role])}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
