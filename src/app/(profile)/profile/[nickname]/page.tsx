import { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import UserCollectionLoading from "./loading";
import { getUserByIdentifier } from "@/app/data-fetching";
import { SearchUser } from "@/lib/universal/cosmo/auth";
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

  return (
    <Suspense fallback={<UserCollectionLoading />}>
      <UserCollectionRenderer profile={profile} />
    </Suspense>
  );
}

type RendererProps = {
  profile: SearchUser;
};

async function UserCollectionRenderer({ profile }: RendererProps) {
  const [artists, lockedObjekts] = await Promise.all([
    fetchArtistsWithMembers(),
    fetchLockedObjekts(profile.address),
  ]);

  return (
    <section className="flex flex-col">
      <ProfileRenderer
        {...profile}
        lockedObjekts={lockedObjekts}
        artists={artists}
      />
    </section>
  );
}
