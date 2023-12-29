import { cacheMembers } from "@/lib/server/cache/available-artists";
import { Metadata } from "next";
import { decodeUser } from "../data-fetching";
import { fetchLockedObjekts } from "@/lib/server/collection/locked-objekts";
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
    <main className="container flex flex-col py-2">
      <CollectionRenderer
        lockedObjekts={lockedObjekts}
        artists={artists}
        user={user!}
      />
    </main>
  );
}
