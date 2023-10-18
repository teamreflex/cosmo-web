import { cacheMembers, fetchLockedObjekts } from "@/lib/server/cache";
import CollectionRenderer from "@/components/collection/collection-renderer";
import { Metadata } from "next";
import { decodeUser } from "../data-fetching";

export const runtime = "edge";
export const metadata: Metadata = {
  title: "Collection",
};

export default async function CollectionPage() {
  const user = await decodeUser();

  const [lockedObjekts, artists] = await Promise.all([
    fetchLockedObjekts(user!.id),
    cacheMembers(),
  ]);

  return (
    <main className="container flex flex-col py-2">
      <CollectionRenderer locked={lockedObjekts} artists={artists} />
    </main>
  );
}
