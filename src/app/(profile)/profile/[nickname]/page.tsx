import { Metadata } from "next";
import { notFound } from "next/navigation";
import { decodeUser, getUserByIdentifier } from "@/app/data-fetching";
import { fetchLockedObjekts } from "@/lib/server/collection/locked-objekts";
import ProfileRenderer from "@/components/profile/profile-renderer";
import { fetchArtistsWithMembers } from "@/lib/server/cosmo/artists";

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
