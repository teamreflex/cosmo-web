import { Metadata } from "next";
import {
  decodeUser,
  getProfile,
  getUserByIdentifier,
} from "@/app/data-fetching";
import ProfileRenderer from "@/components/profile/profile-renderer";
import { fetchArtistsWithMembers } from "@/lib/server/cosmo/artists";
import { Loader2, Shield } from "lucide-react";
import { addrcomp } from "@/lib/utils";
import { Suspense } from "react";
import PreviousIds from "@/components/profile/previous-ids";
import { ProfileProvider } from "@/hooks/use-profile";
import RewardsRenderer from "@/components/rewards/rewards-renderer";
import { ObjektRewardProvider } from "@/hooks/use-objekt-rewards";
import { ErrorBoundary } from "react-error-boundary";
import { getSelectedArtist } from "@/lib/server/profiles";
import { fetchPins } from "@/lib/server/objekts/pins";

type Props = {
  params: {
    nickname: string;
  };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { profile } = await getUserByIdentifier(params.nickname);

  return {
    title: `${profile.nickname}'s Collection`,
  };
}

export default async function UserCollectionPage({ params }: Props) {
  const user = await decodeUser();
  const selectedArtist = getSelectedArtist();

  const isOwnProfile =
    user !== undefined && addrcomp(user.nickname, params.nickname);

  const [artists, currentUser, targetUser] = await Promise.all([
    fetchArtistsWithMembers(),
    user ? getProfile(user.profileId) : undefined,
    getUserByIdentifier(params.nickname),
  ]);

  if (targetUser.profile.privacy.objekts && !isOwnProfile) {
    return <Private nickname={targetUser.profile.nickname} />;
  }

  const pins = await fetchPins(targetUser.pins);

  return (
    <ProfileProvider
      profile={targetUser.profile}
      objektLists={targetUser.objektLists}
      lockedObjekts={targetUser.lockedObjekts}
      pins={pins}
    >
      <ObjektRewardProvider
        rewardsDialog={
          isOwnProfile && (
            <ErrorBoundary fallback={null}>
              <Suspense>
                <RewardsRenderer user={user} artist={selectedArtist} />
              </Suspense>
            </ErrorBoundary>
          )
        }
      >
        <section className="flex flex-col">
          <ProfileRenderer
            artists={artists}
            profile={targetUser.profile}
            user={currentUser}
            previousIds={
              targetUser.profile.privacy.nickname && !isOwnProfile ? null : (
                <Suspense
                  fallback={
                    <div className="flex justify-center">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  }
                >
                  <PreviousIds address={targetUser.profile.address} />
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
