import { decodeUser, getUserByIdentifier } from "@/app/data-fetching";
import { PropsWithChildren, Suspense } from "react";
import ProfileImage from "@/assets/profile.webp";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ComoBalances from "@/components/navbar/como-balances";
import CopyAddressButton from "@/components/profile/copy-address-button";
import OpenSeaButton from "@/components/profile/opensea-button";
import PolygonButton from "@/components/profile/polygon-button";
import TradesButton from "@/components/profile/trades-button";
import BackButton from "@/components/profile/back-button";
import ListsButton from "@/components/profile/lists-button";
import ComoButton from "@/components/profile/como-button";
import { SearchUser } from "@/lib/universal/cosmo/auth";
import { Shield } from "lucide-react";
import { validArtists } from "@/lib/universal/cosmo/common";
import ArtistIcon from "@/components/artist-icon";
import ProgressButton from "@/components/profile/progress-button";

type Props = PropsWithChildren<{
  params: {
    nickname: string;
  };
}>;

export default async function ProfileLayout({ children, params }: Props) {
  const currentUser = await decodeUser();
  const profile = await getUserByIdentifier(params.nickname);

  const url = `/@${profile.isAddress ? profile.address : profile.nickname}`;

  return (
    <main className="container flex flex-col gap-2 sm:gap-0 py-2">
      <div className="flex gap-4 items-center h-fit">
        <Avatar className="h-24 w-24">
          <AvatarFallback>
            {profile.nickname.charAt(0).toUpperCase()}
          </AvatarFallback>
          <AvatarImage
            className="bg-cosmo-profile p-3"
            src={ProfileImage.src}
            alt={profile.nickname}
          />
        </Avatar>

        <div className="flex flex-col w-full">
          {/* nickname & como */}
          <div className="flex flex-wrap items-center justify-between">
            <span className="w-fit text-2xl sm:text-3xl font-cosmo font-bold uppercase">
              {profile.nickname}
            </span>

            <ComoBlock profile={profile} />
          </div>

          {/* buttons */}
          <div className="flex flex-wrap gap-2 py-1">
            <OpenSeaButton address={profile.address} />
            <PolygonButton address={profile.address} />
            <CopyAddressButton address={profile.address} />
            <TradesButton
              nickname={profile.isAddress ? profile.address : profile.nickname}
            />
            <ComoButton
              nickname={profile.isAddress ? profile.address : profile.nickname}
            />
            <ProgressButton
              nickname={profile.isAddress ? profile.address : profile.nickname}
            />
            <ListsButton
              nickname={profile.isAddress ? profile.address : profile.nickname}
              address={profile.address}
              allowCreate={currentUser?.address === profile.address}
            />
            <BackButton url={url} tooltip="Return to Profile" />
            {/* content gets portaled in */}
            <span className="h-10 flex items-center">
              <div id="help" />
            </span>
            <span className="h-10 flex items-center sm:hidden">
              <div id="filters-button" />
            </span>
            <span className="h-10 flex items-center last:ml-auto">
              <div id="objekt-total" />
            </span>
          </div>
        </div>
      </div>

      {children}
    </main>
  );
}

function ComoBlock({ profile }: { profile: SearchUser }) {
  if (profile.privacy.como) {
    return (
      <div className="flex items-center gap-2">
        {validArtists.map((artist) => (
          <div
            key={artist}
            className="flex justify-between items-center rounded cursor-default bg-accent border border-black/30 dark:border-white/30 h-[26px] min-w-16 w-fit px-1 shadow"
          >
            <ArtistIcon artist={artist} />
            <Shield className="w-5 h-5"></Shield>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2">
          <div className="h-[26px] w-16 rounded bg-accent animate-pulse" />
          <div className="h-[26px] w-16 rounded bg-accent animate-pulse" />
        </div>
      }
    >
      <ComoBalances address={profile.address} />
    </Suspense>
  );
}
