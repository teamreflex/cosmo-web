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
  const user = await getUserByIdentifier(params.nickname);
  if (!user) notFound();

  return {
    title: `${user.nickname}'s Collection`,
  };
}

export default async function UserCollectionPage({ params }: Props) {
  const user = await decodeUser();
  const currentUser = user ? await getProfile(user.profileId) : undefined;
  const profile = await getUserByIdentifier(params.nickname);
  if (!profile) notFound();

  if (profile.privacy.objekts && !addrcomp(user?.address, profile.address)) {
    return <Private nickname={profile.nickname} />;
  }

  const [artists, lockedObjekts] = await Promise.all([
    fetchArtistsWithMembers(),
    fetchLockedObjekts(profile.address),
  ]);

  const shouldHideNickname =
    profile.privacy.nickname && !addrcomp(user?.address, profile.address);

  return (
    <ProfileProvider profile={profile}>
      <section className="flex flex-col">
        <ProfileRenderer
          lockedObjekts={lockedObjekts}
          artists={artists}
          profile={profile}
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
                <PreviousIds address={profile.address} />
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
