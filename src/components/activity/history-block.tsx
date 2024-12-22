import { fetchActivityHistory } from "@/lib/server/cosmo/activity";
import { TokenPayload } from "@/lib/universal/auth";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { LuChevronRight, LuHistory } from "react-icons/lu";
import Image from "next/image";
import Link from "next/link";

type Props = {
  artist: ValidArtist;
  user: TokenPayload;
};

export default async function HistoryBlock({ user, artist }: Props) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const history = await fetchActivityHistory(user.accessToken, {
    artistName: artist,
    historyType: "all",
    fromTimestamp: first.toISOString(),
    toTimestamp: now.toISOString(),
  });

  if (history.length === 0) {
    return (
      <Link
        href="/activity/history"
        className="w-full flex gap-2 justify-between items-center h-16 bg-accent rounded-xl p-4 transition-colors border border-transparent hover:border-cosmo"
      >
        <div className="flex gap-4 items-center">
          <LuHistory className="size-5 text-muted-foreground" />

          <div className="flex flex-col text-sm font-semibold">
            <p className="text-muted-foreground">History</p>
            <p>There is no history yet for this month.</p>
          </div>
        </div>

        <LuChevronRight className="size-5" />
      </Link>
    );
  }

  const item = history[0];

  return (
    <Link
      href="/activity/history"
      className="w-full flex gap-2 justify-between items-center h-16 bg-accent rounded-xl p-4 transition-colors border border-transparent hover:border-cosmo"
    >
      <div className="flex gap-4 items-center">
        <div className="relative aspect-square size-5">
          <Image src={item.icon} alt={item.title} fill={true} />
        </div>

        <div className="flex flex-col text-sm font-semibold">
          <p className="text-muted-foreground">{item.title}</p>
          <p>{item.body}</p>
        </div>
      </div>

      <LuChevronRight className="size-5" />
    </Link>
  );
}
