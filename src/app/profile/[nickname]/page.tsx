import { Metadata } from "next";
import { Suspense } from "react";
import { search } from "@/lib/server/cosmo";
import { notFound } from "next/navigation";
import UserCollectionLoading from "./loading";
import { isAddress } from "ethers/lib/utils";
import { cacheMembers } from "@/lib/server/cache";
import CollectionRenderer from "@/components/collection/collection-renderer";
import { fetchLockedObjekts } from "@/lib/server/collection";

export const runtime = "edge";

type Props = {
  params: { nickname: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  console.log(params);
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
          nickname={params.nickname.substring(0, 6)}
          address={params.nickname}
        />
      </Suspense>
    );
  }

  const result = await search(params.nickname);
  const user = result.find(
    (u) => u.nickname.toLowerCase() === params.nickname.toLowerCase()
  );

  if (!user) notFound();

  return (
    <Suspense fallback={<UserCollectionLoading />}>
      <UserCollectionRenderer nickname={user.nickname} address={user.address} />
    </Suspense>
  );
}

type UserCollectionProps = {
  nickname: string;
  address: string;
};

async function UserCollectionRenderer({
  nickname,
  address,
}: UserCollectionProps) {
  const [lockedObjekts, artists] = await Promise.all([
    fetchLockedObjekts(address),
    cacheMembers(),
  ]);

  return (
    <main className="container flex flex-col py-2">
      <CollectionRenderer
        locked={lockedObjekts}
        artists={artists}
        nickname={nickname}
        address={address}
      />
    </main>
  );
}
