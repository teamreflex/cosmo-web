import { cacheMembers } from "@/lib/server/cache";
import { fetchLockedObjekts } from "@/lib/server/collection";
import CollectionRenderer from "../collection/collection-renderer";

type Props = {
  nickname: string;
  address: string;
};

export default async function UserCollectionRenderer({
  nickname,
  address,
}: Props) {
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
