import SkeletonGradient from "@/components/skeleton/skeleton-overlay";
import { Skeleton } from "@/components/ui/skeleton";
import { useArtists } from "@/hooks/use-artists";
import { useProgressFilters } from "@/hooks/use-progress-filters";
import { m } from "@/i18n/messages";
import {
  artistStatsQuery,
  memberCompletionQuery,
} from "@/lib/queries/progress";
import type {
  ArtistStats,
  MemberCompletion,
  Stat,
} from "@/lib/universal/progress";
import { cn } from "@/lib/utils";
import { IconArrowRight, IconRefresh } from "@tabler/icons-react";
import { useSuspenseQueries } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { useMemo } from "react";
import { useErrorBoundary } from "react-error-boundary";
import { Button } from "../ui/button";
import MemberAvatar from "./member-avatar";

const route = getRouteApi("/@{$username}");

const TOP_MEMBERS = 5;

type Props = {
  address: string;
};

/**
 * Completion of the members the profile owns the most objekts of, leading into each
 * member's progress, above a breakdown of objekts owned per season and class.
 */
export default function ProgressOverview(props: Props) {
  const [{ data }, { data: completion }] = useSuspenseQueries({
    queries: [
      artistStatsQuery(props.address),
      memberCompletionQuery(props.address),
    ],
  });
  const { filters } = useProgressFilters();

  const stats = useMemo(() => {
    const scoped = filters.artist
      ? data.filter(
          (stat) =>
            stat.artistName.toLowerCase() === filters.artist?.toLowerCase(),
        )
      : data;
    return mergeStats(scoped);
  }, [filters.artist, data]);

  const completionMap = new Map(completion.map((c) => [c.member, c]));
  const total = stats.members.reduce((acc, stat) => acc + stat.count, 0);

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div className="grid grid-cols-1 overflow-hidden rounded-xl border bg-card max-sm:divide-y sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent md:grid-cols-3 lg:grid-cols-5">
        {stats.members.slice(0, TOP_MEMBERS).map((stat) => (
          <MemberTile
            key={stat.name}
            stat={stat}
            completion={completionMap.get(stat.name)}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <StatList
          title={m.progress_objekts_by_season()}
          data={stats.seasons}
          total={total}
        />
        <StatList
          title={m.progress_objekts_by_class()}
          data={stats.classes}
          total={total}
        />
      </div>
    </div>
  );
}

type MemberTileProps = {
  stat: Stat;
  completion: MemberCompletion | undefined;
};

function MemberTile({ stat, completion }: MemberTileProps) {
  const { username } = route.useParams();
  const { getArtistForMember, getArtist } = useArtists();
  const artistId = getArtistForMember(stat.name);
  const artist = artistId ? getArtist(artistId) : undefined;

  const progress = completion && {
    ...completion,
    percentage: Math.floor((completion.count / completion.total) * 100),
  };
  const objekts = m.progress_objekt_count({
    count: stat.count.toLocaleString(),
  });

  return (
    <Link
      to="/@{$username}/progress"
      params={{ username }}
      search={{ member: stat.name }}
      className="flex items-center gap-3 bg-card px-4 py-3 transition-colors hover:bg-accent/50 sm:flex-col sm:items-stretch sm:gap-4 sm:rounded-xl sm:border sm:p-4 sm:hover:border-cosmo/50"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <MemberAvatar member={stat.name} className="size-10 sm:size-12" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="flex items-baseline gap-2 sm:flex-col sm:gap-0.5">
              <span className="font-cosmo text-sm uppercase sm:text-base">
                {stat.name}
              </span>
              {artist && (
                <span className="text-xs text-muted-foreground">
                  {artist.title}
                </span>
              )}
            </span>
            <span className="font-bold tabular-nums sm:hidden">
              {progress ? `${progress.percentage}%` : objekts}
            </span>
          </div>
          {progress && (
            <Bar value={progress.percentage} className="sm:hidden" />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 max-sm:hidden">
        {progress === undefined ? (
          <span className="text-2xl font-bold tabular-nums">{objekts}</span>
        ) : (
          <>
            <span className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums">
                {progress.percentage}%
              </span>
              <span className="text-sm text-muted-foreground">
                {m.progress_complete_suffix()}
              </span>
            </span>
            <Bar value={progress.percentage} />
            <span className="text-xs text-muted-foreground tabular-nums">
              {progress.count} / {progress.total} · {objekts}
            </span>
          </>
        )}
      </div>

      <span className="flex items-center justify-between text-sm font-semibold text-cosmo-text">
        <span className="max-sm:sr-only">{m.progress_view_progress()}</span>
        <IconArrowRight className="size-4 max-sm:text-muted-foreground" />
      </span>
    </Link>
  );
}

type StatListProps = {
  title: string;
  data: Stat[];
  total: number;
};

function StatList(props: StatListProps) {
  const max = props.data[0]?.count ?? 0;

  return (
    <section className="flex flex-col gap-2 rounded-xl border bg-card px-2 py-4 md:py-5">
      <div className="grid grid-cols-[minmax(0,1fr)_3rem_2.5rem] items-end gap-3 px-3 md:grid-cols-[minmax(0,1fr)_3.5rem_3rem] md:px-4">
        <h2 className="font-cosmo text-lg uppercase">{props.title}</h2>
        <span className="text-right text-xs text-muted-foreground">
          {m.progress_column_objekts()}
        </span>
        <span className="text-right text-xs text-muted-foreground">
          {m.progress_column_share()}
        </span>
      </div>
      <ul className="flex flex-col">
        {props.data.map((stat) => (
          <li
            key={stat.name}
            className="grid h-9 grid-cols-[5rem_minmax(0,1fr)_3rem_2.5rem] items-center gap-3 rounded-md px-3 text-sm hover:bg-accent/40 md:grid-cols-[6rem_minmax(0,1fr)_3.5rem_3rem] md:px-4"
          >
            <span className="truncate font-semibold">{stat.name}</span>
            {/* a sliver stays visible for single-objekt rows */}
            <Bar value={Math.max((stat.count / max) * 100, 1.5)} />
            <span className="text-right font-semibold tabular-nums">
              {stat.count.toLocaleString()}
            </span>
            <span className="text-right text-xs text-muted-foreground tabular-nums">
              {formatShare(stat.count, props.total)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Bar(props: { value: number; className?: string }) {
  return (
    <div
      className={cn(
        "h-1.5 overflow-hidden rounded-full bg-muted md:h-2",
        props.className,
      )}
    >
      <div
        className="h-full rounded-full bg-cosmo"
        style={{ width: `${props.value}%` }}
      />
    </div>
  );
}

function formatShare(count: number, total: number) {
  const share = (count / total) * 100;
  return share < 1 ? "<1%" : `${Math.round(share)}%`;
}

/**
 * Sum each artist's stats into one, sorted by count.
 */
function mergeStats(stats: ArtistStats[]) {
  function merge(pick: (stat: ArtistStats) => Stat[]): Stat[] {
    const map = new Map<string, number>();
    for (const stat of stats) {
      for (const { name, count } of pick(stat)) {
        map.set(name, (map.get(name) ?? 0) + count);
      }
    }
    return Array.from(map, ([name, count]) => ({ name, count })).sort(
      (a, b) => b.count - a.count,
    );
  }

  return {
    members: merge((stat) => stat.members),
    seasons: merge((stat) => stat.seasons),
    classes: merge((stat) => stat.classes),
  };
}

export function ProgressOverviewSkeleton() {
  return (
    <div className="relative flex flex-col gap-8">
      <SkeletonGradient />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: TOP_MEMBERS }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl sm:h-52" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}

export function ProgressOverviewError() {
  const { resetBoundary } = useErrorBoundary();

  return (
    <div className="flex flex-col items-center gap-2 py-6 text-sm font-semibold">
      <p className="text-center text-sm font-semibold">
        {m.progress_error_fetching_stats()}
      </p>

      <Button variant="outline" onClick={resetBoundary}>
        <IconRefresh className="mr-2" /> {m.error_try_again()}
      </Button>
    </div>
  );
}
