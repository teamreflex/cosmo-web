import { decodeUser, getUserByIdentifier } from "@/app/data-fetching";
import { PropsWithChildren, Suspense } from "react";
import CopyAddressButton from "@/components/profile/copy-address-button";
import OpenSeaButton from "@/components/profile/opensea-button";
import PolygonButton from "@/components/profile/polygon-button";
import TradesButton from "@/components/profile/trades-button";
import BackButton from "@/components/profile/back-button";
import ComoButton from "@/components/profile/como-button";
import { Shield } from "lucide-react";
import { validArtists } from "@/lib/universal/cosmo/common";
import ArtistIcon from "@/components/artist-icon";
import ProgressButton from "@/components/profile/progress-button";
import { addrcomp } from "@/lib/utils";
import ComoBalanceRenderer from "@/components/navbar/como-balances";
import UserAvatar from "@/components/profile/user-avatar";
import Skeleton from "@/components/skeleton/skeleton";
import ListDropdown from "@/components/lists/list-dropdown";

type Props = PropsWithChildren<{
  params: {
    nickname: string;
  };
}>;

export default async function ProfileLayout({ children, params }: Props) {
  const [currentUser, targetUser] = await Promise.all([
    decodeUser(),
    getUserByIdentifier(params.nickname),
  ]);

  const { profile, objektLists } = targetUser;

  const url = `/@${profile.isAddress ? profile.address : profile.nickname}`;

  const showComo =
    profile.privacy.como === false ||
    addrcomp(currentUser?.address, profile.address);

  return (
    <main className="container flex flex-col gap-2 sm:gap-0 py-2">
      <div className="flex gap-4 items-center h-fit">
        <Suspense fallback={<Skeleton className="h-24 w-24 rounded-full" />}>
          <UserAvatar
            token={currentUser?.accessToken}
            nickname={profile.nickname}
          />
        </Suspense>

        <div className="flex flex-col w-full">
          {/* nickname & como */}
          <div className="flex flex-wrap items-center justify-between">
            <span className="w-fit text-2xl sm:text-3xl font-cosmo font-bold uppercase">
              {profile.nickname}
            </span>

            <ComoBlock hide={showComo === false} address={profile.address} />
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
            <ListDropdown
              lists={objektLists}
              nickname={profile.isAddress ? profile.address : profile.nickname}
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

function ComoBlock({ hide, address }: { hide: boolean; address: string }) {
  if (hide) {
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

  return <ComoBalanceRenderer address={address} />;
}
