import { Metadata } from "next";
import { notFound } from "next/navigation";
import { decodeUser, getUserByIdentifier } from "@/app/data-fetching";
import { fetchLockedObjekts } from "@/lib/server/collection/locked-objekts";
import ProfileRenderer from "@/components/profile/profile-renderer";
import { fetchArtistsWithMembers } from "@/lib/server/cosmo/artists";
import { Shield } from "lucide-react";

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
  const profile = await getUserByIdentifier(params.nickname);
  if (!profile) notFound();

  if (profile.privacy.objekts) {
    return <Private nickname={profile.nickname} />;
  }

  const user = await decodeUser();
  const [artists, lockedObjekts] = await Promise.all([
    fetchArtistsWithMembers(),
    fetchLockedObjekts(profile.address),
  ]);

  return (
    <section className="flex flex-col">
      <ProfileRenderer
        lockedObjekts={lockedObjekts}
        artists={artists}
        profile={profile}
        user={user}
      />
    </section>
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
