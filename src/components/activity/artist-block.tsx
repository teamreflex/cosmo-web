import { fetchActivityWelcome } from "@/lib/server/cosmo/activity";
import { fetchArtistBff } from "@/lib/server/cosmo/artists";
import { TokenPayload } from "@/lib/universal/auth";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import Image from "next/image";

type Props = {
  artist: ValidArtist;
  user: TokenPayload;
};

export default async function ArtistBlock({ user, artist }: Props) {
  const [cosmoArtist, welcome] = await Promise.all([
    fetchArtistBff(user.accessToken, artist),
    fetchActivityWelcome(user.accessToken, artist),
  ]);

  return (
    <div className="w-full grid grid-cols-2 gap-4 mx-auto">
      <div className="relative rounded-xl object-contain aspect-square overflow-hidden">
        <Image
          src={cosmoArtist.primaryImageUrl}
          fill={true}
          alt={cosmoArtist.title}
        />
      </div>

      <div className="rounded-xl aspect-square bg-accent p-4">
        <p className="text-xl lg:text-3xl font-semibold">
          with {welcome.fandomName}
        </p>
        <p className="text-2xl lg:text-4xl font-semibold text-cosmo-text">
          D+{welcome.durationCount}
        </p>
      </div>
    </div>
  );
}
