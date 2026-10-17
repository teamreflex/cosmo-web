import { useProfileContext } from "@/hooks/use-profile";
import { m } from "@/i18n/messages";
import {
  progressLeaderboardQuery,
  progressRankQuery,
} from "@/lib/queries/progress";
import type { LeaderboardItem } from "@/lib/universal/progress";
import { cn } from "@/lib/utils";
import type { ValidOnlineType } from "@apollo/cosmo/types/common";
import { isEqual } from "@apollo/util";
import { useSuspenseQueries } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import RankNumber from "../gravity/rank-number";
import { Skeleton } from "../ui/skeleton";

type Props = {
  address: string;
  member: string;
  onlineType: ValidOnlineType | undefined;
  season: string | undefined;
};

export default function ProgressLeaderboardContent(props: Props) {
  const username = useProfileContext((state) => state.target?.cosmo?.username);
  const [{ data }, { data: rank }] = useSuspenseQueries({
    queries: [
      progressLeaderboardQuery(props.member, props.onlineType, props.season),
      progressRankQuery(
        props.address,
        props.member,
        props.onlineType,
        props.season,
      ),
    ],
  });

  const percentage = (count: number) =>
    data.total === 0 ? 0 : Math.floor((count / data.total) * 100);

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-center gap-4 rounded-xl border border-cosmo/45 bg-cosmo/14 px-4 py-3.5">
        {rank === null ? (
          <p className="text-sm text-muted-foreground">
            {m.progress_unranked()}
          </p>
        ) : (
          <>
            <span className="text-3xl leading-none font-bold tabular-nums">
              #{rank.rank.toLocaleString()}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-bold">
                {username} · {percentage(rank.count)}%
              </span>
              <span className="text-sm text-muted-foreground">
                {m.progress_rank_collectors({
                  count: rank.collectors.toLocaleString(),
                  member: props.member,
                })}
              </span>
            </div>
          </>
        )}
      </div>

      <ol className="flex flex-col gap-1">
        {data.leaderboard.map((item, i) => {
          const isTarget = isEqual(item.address, props.address);
          const value = percentage(item.count);
          return (
            <li
              key={item.address}
              className={cn(
                "grid min-h-11 grid-cols-[1.25rem_minmax(0,1fr)_6rem_2.75rem] items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                isTarget
                  ? "bg-cosmo/14 ring-1 ring-cosmo/45 ring-inset"
                  : "hover:bg-accent/40",
              )}
            >
              <RankNumber rank={i + 1} className="text-right font-semibold" />
              <ProfileLink
                item={item}
                member={props.member}
                className="truncate font-semibold"
              />
              <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                <span
                  className={cn(
                    "block h-full rounded-full",
                    isTarget ? "bg-cosmo" : "bg-muted-foreground/60",
                  )}
                  style={{ width: `${value}%` }}
                />
              </span>
              <span className="text-right font-bold tabular-nums">
                {value}%
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

type ProfileLinkProps = {
  item: LeaderboardItem;
  member: string;
  className?: string;
};

function ProfileLink({ item, member, className }: ProfileLinkProps) {
  return (
    <Link
      className={cn("hover:underline", className)}
      to="/@{$username}/progress"
      params={{ username: item.isAddress ? item.address : item.nickname }}
      search={{ member }}
    >
      {item.nickname}
    </Link>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-5">
      <Skeleton className="h-17 rounded-xl" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 25 }).map((_, i) => (
          <Skeleton key={i} className="h-9 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
