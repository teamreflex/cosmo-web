import { useArtists } from "@/hooks/use-artists";
import { useProgressFilters } from "@/hooks/use-progress-filters";
import { m } from "@/i18n/messages";
import { filterDataQuery } from "@/lib/queries/core";
import { progressBreakdownQuery } from "@/lib/queries/progress";
import type { SeasonProgress } from "@/lib/universal/progress";
import { classSort, seasonSort } from "@/lib/utils";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import { IconArrowLeft } from "@tabler/icons-react";
import { useSuspenseQueries } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Skeleton } from "../ui/skeleton";
import MemberAvatar from "./member-avatar";
import ProgressBreakdown from "./progress-breakdown";
import type { BreakdownRow } from "./progress-breakdown";
import ProgressLeaderboard from "./progress-leaderboard";
import ProgressRankCard from "./progress-rank-card";

const route = getRouteApi("/@{$username}");

type Props = {
  artist: ValidArtist;
  address: string;
  member: string;
};

/**
 * A member's collection progress: overall completion, leaderboard standing and the
 * season by class breakdown.
 */
export default function ProgressMember(props: Props) {
  const { filters, setFilter } = useProgressFilters();
  const { getArtist } = useArtists();
  const [progressQuery, filterQuery] = useSuspenseQueries({
    queries: [
      progressBreakdownQuery(props.address, props.member),
      filterDataQuery,
    ],
  });

  const onlineType = filters.filter ?? undefined;
  const { rows, classes } = buildBreakdown(
    progressQuery.data,
    onlineType ?? "combined",
    props.artist,
  );

  const totals = rows.reduce(
    (acc, row) => ({
      owned: acc.owned + row.owned,
      total: acc.total + row.total,
      bonus: acc.bonus + row.bonus,
      complete: acc.complete + (row.owned === row.total ? 1 : 0),
    }),
    { owned: 0, total: 0, bonus: 0, complete: 0 },
  );
  const percentage =
    totals.total === 0 ? 0 : Math.floor((totals.owned / totals.total) * 100);

  return (
    <div className="flex flex-col gap-6 pb-8">
      <BackLink />

      <section className="flex flex-wrap gap-4">
        <div className="flex min-w-0 flex-[999_1_32rem] flex-col gap-5 rounded-xl border bg-card p-5 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <MemberAvatar
                member={props.member}
                className="size-14 md:size-18"
              />
              <div className="flex flex-col gap-1.5">
                <h2 className="font-cosmo text-2xl leading-none uppercase md:text-4xl">
                  {props.member}
                </h2>
                <span className="text-sm font-semibold text-muted-foreground">
                  {getArtist(props.artist)?.title}
                </span>
              </div>
            </div>
            <p className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tabular-nums md:text-6xl">
                {percentage}%
              </span>
              <span className="text-sm text-muted-foreground">
                {m.progress_complete_suffix()}
              </span>
            </p>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-muted md:h-2.5">
            <div
              className="h-full rounded-full bg-cosmo"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <dl className="grid grid-cols-2 gap-x-7 gap-y-3 sm:flex sm:flex-wrap">
            <Total label={m.progress_collected()}>
              {totals.owned}
              <span className="font-medium text-muted-foreground">
                {" "}
                / {totals.total}
              </span>
            </Total>
            <Total label={m.progress_missing()}>
              <span className="text-cosmo-text">
                {totals.total - totals.owned}
              </span>
            </Total>
            <Total label={m.progress_unobtainable_owned()}>
              {totals.bonus}
            </Total>
            <Total label={m.progress_seasons_complete()}>
              {m.progress_of_total({
                count: totals.complete,
                total: rows.length,
              })}
            </Total>
          </dl>
        </div>

        <ProgressRankCard
          address={props.address}
          member={props.member}
          onlineType={onlineType}
        />
      </section>

      <ProgressBreakdown
        // reset the expanded cell when the filter swaps the data out
        key={`${props.member}:${onlineType ?? "combined"}`}
        rows={rows}
        classes={classes}
        onlineType={onlineType}
        setOnlineType={(value) => setFilter("filter", value)}
      />

      <ProgressLeaderboard
        address={props.address}
        member={props.member}
        seasons={filterQuery.data.seasons}
      />
    </div>
  );
}

function BackLink() {
  const { username } = route.useParams();

  return (
    <Link
      to="/@{$username}/progress"
      params={{ username }}
      className="flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-cosmo-text hover:underline"
    >
      <IconArrowLeft className="size-4" />
      {m.progress_all_members()}
    </Link>
  );
}

function Total(props: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-0.5">
      <dt className="text-xs text-muted-foreground md:text-sm">
        {props.label}
      </dt>
      <dd className="text-xl font-bold tabular-nums">{props.children}</dd>
    </div>
  );
}

/**
 * Group the breakdown into season rows for one online type, dropping seasons and
 * classes the member has no obtainable collections in.
 */
function buildBreakdown(
  progress: SeasonProgress[],
  type: SeasonProgress["type"],
  artist: ValidArtist,
) {
  const inType = progress.filter((p) => p.type === type && p.total > 0);
  const classes = Array.from(new Set(inType.map((p) => p.class))).sort((a, b) =>
    classSort(a, b, artist),
  );
  const seasons = Array.from(new Set(inType.map((p) => p.season))).sort(
    seasonSort,
  );

  const rows = seasons.map((season): BreakdownRow => {
    const cells = new Map(
      inType.filter((p) => p.season === season).map((p) => [p.class, p]),
    );
    const inSeason = Array.from(cells.values());
    return {
      season,
      cells,
      owned: inSeason.reduce((acc, p) => acc + p.progress, 0),
      total: inSeason.reduce((acc, p) => acc + p.total, 0),
      bonus: inSeason.reduce((acc, p) => acc + p.unobtainable, 0),
    };
  });

  return { rows, classes };
}

export function ProgressMemberSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-11 w-32" />
      <div className="flex flex-wrap gap-4">
        <Skeleton className="h-60 flex-[999_1_32rem] rounded-xl" />
        <Skeleton className="h-60 flex-[1_1_16rem] rounded-xl" />
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
