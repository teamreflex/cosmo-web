import { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import UserCollectionLoading from "./loading";
import { isAddress } from "ethers/lib/utils";
import { cacheMembers } from "@/lib/server/cache";
import CollectionRenderer from "@/components/collection/collection-renderer";
import { fetchCollectionByNickname } from "@/lib/server/auth";
import { PublicUser } from "@/lib/universal/auth";
import { decodeUser } from "@/app/data-fetching";

type Props = {
  params: { nickname: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const name = isAddress(params.nickname)
    ? params.nickname.substring(0, 6)
    : params.nickname;
  return {
    title: `${name}'s Collection`,
  };
}

export default async function UserCollectionPage({ params }: Props) {
  if (isAddress(params.nickname)) {
    return (
      <Suspense fallback={<UserCollectionLoading />}>
        <UserCollectionRenderer
          user={{
            nickname: params.nickname.substring(0, 6),
            address: params.nickname,
            lockedObjekts: [],
            lists: [],
          }}
        />
      </Suspense>
    );
  }

  const user = await fetchCollectionByNickname(params.nickname);
  if (!user) notFound();

  return (
    <Suspense fallback={<UserCollectionLoading />}>
      <UserCollectionRenderer user={user} />
    </Suspense>
  );
}

async function UserCollectionRenderer({ user }: { user: PublicUser }) {
  const artists = await cacheMembers();
  const currentUser = await decodeUser();

  return (
    <main className="container flex flex-col py-2">
      <CollectionRenderer
        artists={artists}
        locked={user.lockedObjekts}
        nickname={user.nickname}
        address={user.address}
        lists={user.lists}
        currentUser={currentUser}
      />
    </main>
  );
}
