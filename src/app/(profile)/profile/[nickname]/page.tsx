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
import RewardsRenderer from "@/components/rewards/rewards-renderer";
import { ObjektRewardProvider } from "@/hooks/use-objekt-rewards";

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

  const isOwnProfile =
    user !== undefined && addrcomp(user.address, targetUser.address);

  if (targetUser.privacy.objekts && !isOwnProfile) {
    return <Private nickname={targetUser.nickname} />;
  }

  const shouldHideNickname = targetUser.privacy.nickname && !isOwnProfile;

  return (
    <ProfileProvider profile={targetUser}>
      <ObjektRewardProvider
        rewardsDialog={
          isOwnProfile && (
            <Suspense>
              <RewardsRenderer user={user} />
            </Suspense>
          )
        }
      >
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
      </ObjektRewardProvider>
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
