import { Leaderboard, LeaderboardItem } from "@/lib/universal/progress";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import Skeleton from "../skeleton/skeleton";
import { ordinal } from "@/lib/utils";
import Link from "next/link";

type Props = {
  member: string;
};

export default function ProgressLeaderboardContent({ member }: Props) {
  const { data } = useSuspenseQuery({
    queryKey: ["progress-leaderboard", member],
    queryFn: async () => {
      return await ofetch<Leaderboard>(`/api/progress/leaderboard/${member}`);
    },
  });

  return (
    <div className="flex flex-col gap-4 py-2">
      {data.leaderboard.map((item, i) => (
        <LeaderboardRow
          key={item.address}
          member={member}
          total={data.total}
          item={item}
          rank={i + 1}
        />
      ))}
    </div>
  );
}

type LeaderboardRowProps = {
  member: string;
  total: number;
  item: LeaderboardItem;
  rank: number;
};
function LeaderboardRow({ member, total, item, rank }: LeaderboardRowProps) {
  const progress = Math.round((item.count / total) * 100);

  return (
    <div className="flex flex-col">
      <div className="flex flex-row justify-between items-center">
        <span className="font-semibold">{ordinal(rank)}</span>
        <Link
          className="font-cosmo underline"
          href={`/@${
            item.isAddress ? item.address : item.nickname
          }/progress?member=${member}`}
          prefetch={false}
        >
          {item.nickname}
        </Link>
      </div>

      <div className="relative h-4 w-full overflow-hidden rounded-full bg-secondary">
        <div className="z-20 absolute w-full h-full flex items-center justify-center">
          <p className="text-sm font-semibold text-cosmo mix-blend-overlay">
            {progress}%
          </p>
        </div>
        <div
          className="z-10 h-full w-full flex-1 bg-primary transition-all"
          style={{ transform: `translateX(-${100 - (progress || 0)}%)` }}
        />
      </div>
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div className="flex flex-col" key={i}>
          <div className="flex flex-row justify-between items-center h-6">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-16" />
          </div>

          <Skeleton className="h-4 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}
