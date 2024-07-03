import { fetchActivityWelcome } from "@/lib/server/cosmo/activity";
import { fetchArtistBff } from "@/lib/server/cosmo/artists";
import { TokenPayload } from "@/lib/universal/auth";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import Image from "next/image";

type Props = {
  artist: ValidArtist;
  user: TokenPayload;
};

const errorMap: Record<string, string> = {
  "not-following": "You are not following this artist",
  error: "Could not load artist information",
};

export default async function ArtistBlock({ user, artist }: Props) {
  const [cosmoArtist, welcome] = await Promise.all([
    fetchArtistBff(user.accessToken, artist),
    fetchActivityWelcome(user.accessToken, artist),
  ]);

  if (welcome.success === false) {
    return (
      <div className="w-full flex flex-col items-center mx-auto">
        <span className="text-sm font-semibold">
          {errorMap[welcome.error] ?? welcome.error}
        </span>
      </div>
    );
  }

  return (
    <div className="w-full relative rounded-xl object-contain aspect-square overflow-hidden border border-accent">
      <div className="z-20 absolute inset-0 p-4 bg-black/50">
        <p className="text-xl lg:text-3xl font-semibold">
          with {welcome.result.fandomName}
        </p>
        <p className="text-2xl lg:text-4xl font-semibold text-cosmo-text">
          D+{welcome.result.durationCount}
        </p>
      </div>

      <Image
        className="z-10"
        src={cosmoArtist.primaryImageUrl}
        fill={true}
        alt={cosmoArtist.title}
      />
    </div>
  );
}
