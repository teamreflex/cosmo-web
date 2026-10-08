import { useProgressFilters } from "@/hooks/use-progress-filters";
import { m } from "@/i18n/messages";
import { progressRankQuery } from "@/lib/queries/progress";
import type { ProgressRank } from "@/lib/universal/progress";
import type { ValidOnlineType } from "@apollo/cosmo/types/common";
import { IconTrophy } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Skeleton } from "../ui/skeleton";

type Props = {
  address: string;
  member: string;
  onlineType: ValidOnlineType | undefined;
};

/**
 * The profile's place on the member's leaderboard, opening the full leaderboard.
 */
export default function ProgressRankCard(props: Props) {
  const { setFilters } = useProgressFilters();

  return (
    <div className="relative flex min-w-0 flex-[1_1_16rem] flex-col justify-between gap-5 rounded-xl border bg-card p-5 transition-colors has-[button:hover]:border-cosmo/50 has-[button:hover]:bg-accent/40 md:p-7">
      <span className="flex items-center justify-between text-sm font-semibold text-muted-foreground">
        {m.progress_leaderboard()}
        <IconTrophy className="size-5 text-cosmo-text" aria-hidden />
      </span>

      <ErrorBoundary
        fallback={<span className="text-4xl leading-none font-bold">—</span>}
      >
        <Suspense
          fallback={
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-4 w-40" />
            </div>
          }
        >
          <Rank {...props} />
        </Suspense>
      </ErrorBoundary>

      {/* the button's hit area stretches over the whole card */}
      <button
        type="button"
        onClick={() => setFilters({ leaderboard: true })}
        className="self-start text-sm font-semibold text-cosmo-text after:absolute after:inset-0 after:rounded-xl"
      >
        {m.progress_view_leaderboard()}
      </button>
    </div>
  );
}

function Rank(props: Props) {
  const { data } = useSuspenseQuery(
    progressRankQuery(props.address, props.member, props.onlineType, undefined),
  );

  return <Standing rank={data} member={props.member} />;
}

type StandingProps = {
  rank: ProgressRank | null;
  member: string;
};

function Standing({ rank, member }: StandingProps) {
  if (rank === null) {
    return (
      <span className="text-sm text-muted-foreground">
        {m.progress_unranked()}
      </span>
    );
  }

  return (
    <span className="flex flex-col gap-1.5">
      <span className="text-4xl leading-none font-bold tabular-nums md:text-5xl">
        #{rank.rank.toLocaleString()}
      </span>
      <span className="text-sm text-muted-foreground">
        {m.progress_rank_collectors({
          count: rank.collectors.toLocaleString(),
          member,
        })}
      </span>
    </span>
  );
}
