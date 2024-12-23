import { Metadata } from "next";
import {
  decodeUser,
  getProfile,
  getUserByIdentifier,
  getSelectedArtist,
  getArtistsWithMembers,
} from "@/app/data-fetching";
import ProfileRenderer from "@/components/profile/profile-renderer";
import { Shield } from "lucide-react";
import { isAddressEqual } from "@/lib/utils";
import { Suspense } from "react";
import { ProfileProvider } from "@/hooks/use-profile";
import RewardsRenderer from "@/components/rewards/rewards-renderer";
import { ObjektRewardProvider } from "@/hooks/use-objekt-rewards";
import { ErrorBoundary } from "react-error-boundary";
import { fetchPins } from "@/lib/server/objekts/pins";
import { UserStateProvider } from "@/hooks/use-user-state";

type Props = {
  params: Promise<{
    nickname: string;
  }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const { profile } = await getUserByIdentifier(params.nickname);

  return {
    title: `${profile.nickname}'s Collection`,
  };
}

export default async function UserCollectionPage(props: Props) {
  const params = await props.params;
  const user = await decodeUser();
  const selectedArtist = await getSelectedArtist();

  const isOwnProfile =
    user !== undefined && isAddressEqual(user.nickname, params.nickname);

  const [artists, currentUser, targetUser] = await Promise.all([
    getArtistsWithMembers(),
    user ? getProfile(user.profileId) : undefined,
    getUserByIdentifier(params.nickname),
  ]);

  if (targetUser.profile.privacy.objekts && !isOwnProfile) {
    return <Private nickname={targetUser.profile.nickname} />;
  }

  const pins = await fetchPins(targetUser.pins);

  return (
    <ProfileProvider
      currentProfile={currentUser}
      targetProfile={targetUser.profile}
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
          <UserStateProvider artist={selectedArtist} token={user}>
            <ProfileRenderer
              artists={artists}
              profile={targetUser.profile}
              user={currentUser}
            />
          </UserStateProvider>
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
