import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  decodeUser,
  getProfile,
  getUserByIdentifier,
} from "@/app/data-fetching";
import { fetchLockedObjekts } from "@/lib/server/collection/locked-objekts";
import ProfileRenderer from "@/components/profile/profile-renderer";
import { fetchArtistsWithMembers } from "@/lib/server/cosmo/artists";
import { Loader2, Shield } from "lucide-react";
import { addrcomp } from "@/lib/utils";
import { Suspense } from "react";
import PreviousIds from "@/components/profile/previous-ids";
import { ProfileProvider } from "@/hooks/use-profile";

type Props = {
  params: { nickname: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const targetUser = await getUserByIdentifier(params.nickname);
  if (!targetUser) notFound();

  return {
    title: `${targetUser.nickname}'s Collection`,
  };
}

export default async function UserCollectionPage({ params }: Props) {
  const user = await decodeUser();
  const [currentUser, targetUser, artists, lockedObjekts] = await Promise.all([
    user ? getProfile(user.profileId) : undefined,
    getUserByIdentifier(params.nickname),
    fetchArtistsWithMembers(),
    fetchLockedObjekts(params.nickname),
  ]);

  if (!targetUser) notFound();

  if (
    targetUser.privacy.objekts &&
    !addrcomp(currentUser?.address, targetUser.address)
  ) {
    return <Private nickname={targetUser.nickname} />;
  }

  const shouldHideNickname =
    targetUser.privacy.nickname &&
    !addrcomp(currentUser?.address, targetUser.address);

  return (
    <ProfileProvider profile={targetUser}>
      <section className="flex flex-col">
        <ProfileRenderer
          lockedObjekts={lockedObjekts}
          artists={artists}
          profile={targetUser}
          user={currentUser}
          previousIds={
            shouldHideNickname ? null : (
              <Suspense
                fallback={
                  <div className="flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                }
              >
                <PreviousIds address={targetUser.address} />
              </Suspense>
            )
          }
        />
      </section>
    </ProfileProvider>
  );
}

function Private({ nickname }: { nickname: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6">
      <Shield className="w-12 h-12" />
      <p className="text-sm font-semibold">
        {nickname}&apos;s collection is private
      </p>
    </div>
  );
}
