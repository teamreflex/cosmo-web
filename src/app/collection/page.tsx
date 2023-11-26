import { cacheMembers } from "@/lib/server/cache";
import { Metadata } from "next";
import { decodeUser } from "../data-fetching";
import { fetchLockedObjekts } from "@/lib/server/collection";
import CollectionRenderer from "@/components/collection/collection-renderer";

export const metadata: Metadata = {
  title: "Collection",
};

export default async function CollectionPage() {
  const user = await decodeUser();

  const [lockedObjekts, artists] = await Promise.all([
    fetchLockedObjekts(user!.address),
    cacheMembers(),
  ]);

  return (
    <main className="relative py-2">
      <div className="relative container flex flex-col">
        <CollectionRenderer
          locked={lockedObjekts}
          artists={artists}
          address={user!.address}
        />
      </div>
    </main>
  );
}
