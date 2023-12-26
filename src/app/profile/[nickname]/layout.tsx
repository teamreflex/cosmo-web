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
import HelpDialog from "@/components/profile/help-dialog";

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
    <main className="container flex flex-col gap-2 py-2">
      <div className="flex gap-4 items-center">
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
          <div className="flex flex-wrap items-center justify-between">
            {/* nickname */}
            <span className="w-fit text-2xl sm:text-3xl font-cosmo font-bold uppercase">
              {profile.nickname}
            </span>

            {/* como display */}
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
          </div>

          {/* buttons */}
          <div className="flex flex-wrap items-center justify-between">
            <div className="flex flex-wrap items-center gap-2 py-1">
              <OpenSeaButton address={profile.address} />
              <PolygonButton address={profile.address} />
              <HelpDialog />
              <CopyAddressButton address={profile.address} />
              <TradesButton nickname={profile.nickname} />
              <ListsButton
                nickname={
                  profile.isAddress ? profile.address : profile.nickname
                }
                address={profile.address}
                allowCreate={currentUser?.address === profile.address}
              />
              <BackButton url={url} tooltip="Return to profile" />
            </div>

            {/* content gets portaled in */}
            <div id="objekt-total" />
          </div>
        </div>
      </div>

      {children}
    </main>
  );
}
