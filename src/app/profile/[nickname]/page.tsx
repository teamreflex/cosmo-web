import { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import UserCollectionLoading from "./loading";
import { cacheMembers } from "@/lib/server/cache/available-artists";
import CollectionRenderer from "@/components/collection/collection-renderer";
import { decodeUser, getUserByIdentifier } from "@/app/data-fetching";
import { fetchProfileRelations } from "@/lib/server/profile";
import { SearchUser } from "@/lib/universal/cosmo/auth";
import { ObjektList } from "@/lib/universal/objekts";

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

  const { lockedObjekts, lists } = await fetchProfileRelations(
    profile.nickname
  );

  return (
    <Suspense fallback={<UserCollectionLoading />}>
      <UserCollectionRenderer
        profile={profile}
        lockedObjekts={lockedObjekts}
        lists={lists}
      />
    </Suspense>
  );
}

type RendererProps = {
  profile: SearchUser;
  lockedObjekts: number[];
  lists: ObjektList[];
};

async function UserCollectionRenderer({
  profile,
  lockedObjekts,
  lists,
}: RendererProps) {
  const artists = await cacheMembers();
  const currentUser = await decodeUser();

  return (
    <main className="container flex flex-col py-2">
      <CollectionRenderer
        {...profile}
        lockedObjekts={lockedObjekts}
        lists={lists}
        artists={artists}
        currentUser={currentUser}
      />
    </main>
  );
}
