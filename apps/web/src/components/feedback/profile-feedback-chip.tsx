import { m } from "@/i18n/messages";
import { getLocale } from "@/i18n/runtime";
import {
  formatRatings,
  formatScore,
  percentStyle,
  ratedRoleLabels,
  ratingStyles,
  roleNames,
} from "@/lib/client/feedback";
import { formatCount, partyName } from "@/lib/client/trade-listings";
import {
  feedbackEntriesQuery,
  feedbackSummaryQuery,
} from "@/lib/queries/feedback";
import {
  type FeedbackChipView,
  feedbackChipView,
  feedbackSearchDefaults,
  type FeedbackSummary,
  formatPercentPositive,
} from "@/lib/universal/feedback";
import { cn } from "@/lib/utils";
import { feedbackRatings, feedbackRoles } from "@apollo/database/web/types";
import {
  IconArrowRight,
  IconArrowsExchange,
  IconChevronRight,
} from "@tabler/icons-react";
import {
  noop,
  useQueryClient,
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Link, useMatch } from "@tanstack/react-router";
import { type PropsWithChildren, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { capsule } from "../profile/capsule";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card";
import { Skeleton } from "../ui/skeleton";
import { Timestamp } from "../ui/timestamp";
import { FeedbackComment } from "./feedback-text";
import RatingIcon from "./rating-icon";
import RatingShareBar from "./rating-share-bar";

// a pointer that hovers; a tap on a touch screen follows the link instead
const hoverQuery = "(hover: hover)";

const heading = "text-xs font-medium text-muted-foreground";

// the link's own page shows it as active, where it has nowhere further to lead
const activeClass =
  "data-[status=active]:border-cosmo data-[status=active]:text-foreground";

type Props = {
  address: string;
  // the profile's route param, which the feedback page link reuses
  username: string;
  // whether an Apollo account links the address, without which it can't trade
  hasAccount: boolean;
};

/**
 * The profile header's link to its feedback page, summing up the feedback
 * the address received. On a pointer that hovers it opens a card with the
 * score, every rating's count, the roles rated in and the latest ratings.
 * Nothing renders while the summary loads or if it fails.
 */
export default function ProfileFeedbackChip(props: Props) {
  return (
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <FeedbackChip {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

function FeedbackChip({ address, username, hasAccount }: Props) {
  const queryClient = useQueryClient();
  const { data: summary } = useSuspenseQuery(feedbackSummaryQuery(address));
  const onFeedbackPage =
    useMatch({ from: "/@{$username}/feedback", shouldThrow: false }) !==
    undefined;
  const view = feedbackChipView(summary);

  if (view.kind === "none") {
    return hasAccount ? (
      <Link
        to="/@{$username}/feedback"
        params={{ username }}
        className={cn(capsule, activeClass)}
      >
        <IconArrowsExchange aria-hidden className="size-3.5" />
        {m.feedback_badge_none()}
        <ChipChevron />
      </Link>
    ) : null;
  }

  // the card never opens on the feedback page, so nothing would read the fetch
  function prefetchLatest() {
    if (onFeedbackPage) return;
    void queryClient
      .infiniteQuery(feedbackEntriesQuery(address, feedbackSearchDefaults))
      .catch(noop);
  }

  return (
    <HoverCard
      onOpenChange={(open, details) => {
        // the card would only repeat the page it links to
        if (open && (onFeedbackPage || !window.matchMedia(hoverQuery).matches))
          details.cancel();
      }}
    >
      <HoverCardTrigger
        delay={300}
        closeDelay={150}
        onPointerEnter={prefetchLatest}
        onFocus={prefetchLatest}
        render={<Link to="/@{$username}/feedback" params={{ username }} />}
        className={cn(capsule, "gap-1.5 tabular-nums", activeClass)}
      >
        <ChipLabel view={view} />
        <ChipChevron />
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        sideOffset={8}
        collisionPadding={16}
        className="w-80 p-0"
      >
        <FeedbackCard
          summary={summary}
          isNew={view.kind === "counts" && view.isNew}
          address={address}
          username={username}
        />
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * The chip's text. A share positive reads in full from md and as
 * "99.1% · 237" below it, where screen readers still get the full text.
 * Counts read each rating's sign and number, then "new" while the profile
 * has few ratings.
 */
function ChipLabel({
  view,
}: {
  view: Exclude<FeedbackChipView, { kind: "none" }>;
}) {
  const locale = getLocale();

  if (view.kind === "percent") {
    const percent = formatPercentPositive(view.percent, locale);
    const percentClass = cn(
      "font-semibold",
      percentStyle(view.percent) ?? "text-foreground",
    );
    return (
      <>
        <IconArrowsExchange aria-hidden className="size-3.5" />
        <span className="max-md:sr-only">
          <span className={percentClass}>
            {m.feedback_badge_positive({ percent })}
          </span>
          {" · "}
          {formatRatings(view.total)}
        </span>
        <span aria-hidden className="md:hidden">
          <span className={percentClass}>{percent}</span>
          {" · "}
          {formatCount(view.total)}
        </span>
      </>
    );
  }

  return (
    <>
      {feedbackRatings.map((rating) => {
        const count = view.counts[rating];
        if (count === 0) return null;
        const style = ratingStyles[rating];
        return (
          <span key={rating} className="inline-flex items-center gap-0.5">
            <style.icon aria-hidden className={cn("size-3.5", style.text)} />
            <span className="font-semibold text-foreground">
              {formatCount(count)}
            </span>
            <span className="sr-only">{style.label()}</span>
          </span>
        );
      })}
      {view.isNew && <NewTag />}
    </>
  );
}

function ChipChevron() {
  return (
    <IconChevronRight
      aria-hidden
      className="size-3 group-data-[status=active]:hidden"
    />
  );
}

function NewTag() {
  return (
    <span className="rounded-sm bg-muted px-1 py-0.5 text-xxs leading-none font-semibold text-foreground/85">
      {m.feedback_chip_new()}
    </span>
  );
}

/**
 * The hover card: the score, the share positive with a bar of every rating,
 * each rating's count, the roles rated in, then the latest ratings, which
 * load when it opens.
 */
function FeedbackCard({
  summary,
  isNew,
  address,
  username,
}: {
  summary: FeedbackSummary;
  isNew: boolean;
  address: string;
  username: string;
}) {
  const locale = getLocale();
  const score = formatScore(summary.score);

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className={heading}>{m.feedback_card_title()}</span>
          {isNew && <NewTag />}
        </div>

        <div className="flex items-end justify-between gap-3">
          <span className="font-mono text-3xl leading-none font-bold tabular-nums">
            <span className="sr-only">{m.feedback_page_score()} </span>
            <span className="font-sans">{score.sign}</span>
            {score.digits}
          </span>
          <span className="flex flex-col items-end gap-1 text-end">
            {summary.percent === null ? (
              <>
                <span className="text-sm font-semibold">
                  {formatRatings(summary.total)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {m.feedback_page_percent_none()}
                </span>
              </>
            ) : (
              <>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    percentStyle(summary.percent),
                  )}
                >
                  {m.feedback_badge_positive({
                    percent: formatPercentPositive(summary.percent, locale),
                  })}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatRatings(summary.total)}
                </span>
              </>
            )}
          </span>
        </div>

        <RatingShareBar
          counts={summary.counts}
          className="h-1.5 rounded-full"
        />

        <div className="flex flex-col gap-1.5">
          {feedbackRatings.map((rating) => {
            const style = ratingStyles[rating];
            return (
              <div key={rating} className="flex justify-between gap-3 text-sm">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 font-medium",
                    style.text,
                  )}
                >
                  <style.icon aria-hidden className="size-4 shrink-0" />
                  {style.label()}
                </span>
                <span className="font-mono tabular-nums">
                  {formatCount(summary.counts[rating])}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <CardSection title={m.feedback_page_roles()}>
        <div className="grid grid-cols-3 gap-2">
          {feedbackRoles.map((role) => (
            <span key={role} className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">
                {roleNames[role]()}
              </span>
              <span
                className={cn(
                  "font-mono text-sm tabular-nums",
                  summary.roles[role] === 0 && "text-muted-foreground",
                )}
              >
                {formatCount(summary.roles[role])}
              </span>
            </span>
          ))}
        </div>
      </CardSection>

      <ErrorBoundary fallback={null}>
        <Suspense fallback={<LatestSkeleton />}>
          <LatestFeedback address={address} />
        </Suspense>
      </ErrorBoundary>

      <Link
        to="/@{$username}/feedback"
        params={{ username }}
        className="flex items-center justify-between border-t border-border px-4 py-3 text-sm font-semibold text-cosmo-text transition-colors outline-none hover:bg-muted/40 focus-visible:bg-muted/40"
      >
        {m.feedback_card_see_all()}
        <IconArrowRight aria-hidden className="size-4" />
      </Link>
    </div>
  );
}

function CardSection({
  title,
  children,
}: PropsWithChildren<{ title: string }>) {
  return (
    <section className="flex flex-col gap-2.5 border-t border-border px-4 py-3.5">
      <h3 className={heading}>{title}</h3>
      {children}
    </section>
  );
}

// the two newest visible ratings, any rating, one line each
function LatestFeedback({ address }: { address: string }) {
  const { data } = useSuspenseInfiniteQuery(
    feedbackEntriesQuery(address, feedbackSearchDefaults),
  );
  const entries = data.pages.at(0)?.rows.slice(0, 2) ?? [];
  if (entries.length === 0) return null;

  return (
    <CardSection title={m.feedback_card_latest()}>
      {entries.map((entry) => (
        <div key={entry.id} className="flex min-w-0 items-start gap-2">
          <RatingIcon rating={entry.rating} className="mt-0.5 size-3.5" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <FeedbackComment
              text={entry.comment}
              className="truncate text-sm"
            />
            <span className="truncate text-xs text-muted-foreground">
              {partyName(entry.rater)} · {ratedRoleLabels[entry.role]()} ·{" "}
              <Timestamp date={entry.createdAt} relative="narrow" />
            </span>
          </div>
        </div>
      ))}
    </CardSection>
  );
}

function LatestSkeleton() {
  return (
    <CardSection title={m.feedback_card_latest()}>
      {[0, 1].map((row) => (
        <div key={row} className="flex items-start gap-2">
          <Skeleton className="mt-0.5 size-3.5 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </CardSection>
  );
}
