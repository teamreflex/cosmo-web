import { fetchActivityHistory } from "@/lib/server/cosmo/activity";
import { TokenPayload } from "@/lib/universal/auth";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { subMonths } from "date-fns";
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type Props = {
  artist: ValidArtist;
  user: TokenPayload;
};

export default async function HistoryBlock({ user, artist }: Props) {
  const now = new Date();
  const history = await fetchActivityHistory(user.accessToken, {
    artistName: artist,
    historyType: "all",
    fromTimestamp: subMonths(now, 1).toISOString(),
    toTimestamp: now.toISOString(),
  });

  if (history.length === 0) {
    return null;
  }

  const item = history[0];

  return (
    <Link
      href="/activity/history"
      className="w-full flex gap-2 justify-between items-center h-16 bg-accent rounded-xl p-4"
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

      <ChevronRight className="size-5" />
    </Link>
  );
}
