import { fetchActivityBadges } from "@/lib/server/cosmo/activity";
import { TokenPayload } from "@/lib/universal/auth";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { LuChevronRight } from "react-icons/lu";
import Image from "next/image";
import Link from "next/link";

type Props = {
  artist: ValidArtist;
  user: TokenPayload;
};

export default async function BadgeBlock({ user, artist }: Props) {
  const badges = await fetchActivityBadges(user.accessToken, {
    artistName: artist,
    page: 1,
    pageSize: 30,
  });

  const badge = badges.count > 0 ? badges.items[0] : undefined;

  return (
    <Link
      href="/activity/badges"
      className="w-full flex flex-col rounded-xl aspect-square overflow-hidden bg-accent transition-colors border border-transparent hover:border-cosmo"
    >
      <div className="flex items-center justify-between p-4">
        <p className="text-xl lg:text-3xl font-semibold">Badges</p>
        <LuChevronRight className="w-8 h-8" />
      </div>

      {badge !== undefined && (
        <div className="relative w-1/2 aspect-square flex items-center justify-center my-4 mx-auto">
          <Image
            src={badge["2DImage"].originalImage}
            fill={true}
            alt={badge.title}
          />
        </div>
      )}
    </Link>
  );
}
