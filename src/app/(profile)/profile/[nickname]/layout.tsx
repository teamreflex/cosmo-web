import { decodeUser, getUserByIdentifier } from "@/app/data-fetching";
import { PropsWithChildren, Suspense } from "react";
import CopyAddressButton from "@/components/profile/copy-address-button";
import TradesButton from "@/components/profile/trades-button";
import ComoButton from "@/components/profile/como-button";
import { Shield } from "lucide-react";
import { validArtists } from "@/lib/universal/cosmo/common";
import ArtistIcon from "@/components/artist-icon";
import ProgressButton from "@/components/profile/progress-button";
import { isAddressEqual } from "@/lib/utils";
import ComoBalanceRenderer from "@/components/navbar/como-balances";
import UserAvatar from "@/components/profile/user-avatar";
import Skeleton from "@/components/skeleton/skeleton";
import ListDropdown from "@/components/lists/list-dropdown";
import { PublicProfile } from "@/lib/universal/cosmo/auth";
import { ObjektList } from "@/lib/universal/objekts";
import RefreshButton from "@/components/profile/refresh-button";
import VotesButton from "@/components/profile/votes-button";
import Link from "next/link";
import ModhausLogo from "@/assets/modhaus.png";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Props = PropsWithChildren<{
  params: Promise<{
    nickname: string;
  }>;
}>;

export default async function ProfileLayout(props: Props) {
  const params = await props.params;
  const [currentUser, targetUser] = await Promise.all([
    decodeUser(),
    getUserByIdentifier(params.nickname),
  ]);

  const { profile, objektLists } = targetUser;

  const href = `/@${profile.isAddress ? profile.address : profile.nickname}`;
  const showComo =
    profile.privacy.como === false ||
    isAddressEqual(currentUser?.address, profile.address);

  return (
    <main className="relative container flex flex-col gap-2 py-2">
      {/* user block */}
      <div className="flex flex-col">
        <div className="flex flex-row gap-4 items-center">
          <Suspense
            fallback={
              <Skeleton className="h-20 w-20 rounded-full aspect-square shrink-0" />
            }
          >
            <UserAvatar
              className="w-20 h-20"
              token={currentUser?.accessToken}
              nickname={profile.nickname}
            />
          </Suspense>

          <div className="flex flex-col justify-between w-full">
            <div className="flex gap-2 items-center">
              <Link
                href={href}
                className="w-fit text-2xl lg:text-3xl font-cosmo font-bold uppercase underline underline-offset-4 decoration-transparent hover:decoration-cosmo transition-colors"
              >
                {profile.nickname}
              </Link>

              {profile.isModhaus && (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger>
                      <Image
                        className="invert dark:invert-0"
                        src={ModhausLogo.src}
                        alt="Modhaus"
                        width={28}
                        height={27}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <span>Official Modhaus account</span>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <ComoBlock hide={showComo === false} address={profile.address} />
              <span className="h-10 flex items-center last:ml-auto">
                <div id="objekt-total" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* mobile buttons */}
      <Buttons
        profile={profile}
        objektLists={objektLists}
        currentUserAddress={currentUser?.address}
      />

      {props.children}
    </main>
  );
}

type ButtonsProps = {
  profile: PublicProfile;
  objektLists: ObjektList[];
  currentUserAddress: string | undefined;
};

function Buttons({ profile, objektLists, currentUserAddress }: ButtonsProps) {
  const isAuthenticated = currentUserAddress === profile.address;

  return (
    <div className="flex flex-wrap gap-2 justify-center lg:justify-normal md:absolute md:top-2 md:right-4">
      <CopyAddressButton address={profile.address} />
      {isAuthenticated && <RefreshButton />}
      <TradesButton
        nickname={profile.isAddress ? profile.address : profile.nickname}
      />
      <VotesButton
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
        allowCreate={currentUserAddress === profile.address}
      />

      {/* content gets portaled in */}
      <span className="h-10 lg:h-8 flex items-center">
        <div id="help" />
      </span>
      <span className="h-10 flex items-center lg:hidden">
        <div id="filters-button" />
      </span>
    </div>
  );
}

function ComoBlock({ hide, address }: { hide: boolean; address: string }) {
  if (hide) {
    return (
      <div className="flex items-center gap-2">
        {validArtists.map((artist) => (
          <div
            key={artist}
            className="flex justify-between items-center rounded cursor-default bg-accent border border-black/30 dark:border-white/30 h-[26px] min-w-16 w-fit px-1 shadow-sm"
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
