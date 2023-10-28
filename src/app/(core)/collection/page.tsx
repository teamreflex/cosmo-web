import { cacheMembers } from "@/lib/server/cache";
import CollectionRenderer from "@/components/collection/collection-renderer";
import { Metadata } from "next";
import { decodeUser } from "../data-fetching";
import { fetchLockedObjekts } from "@/lib/server/collection";

export const runtime = "edge";
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
      {/* <div className="z-0 absolute w-full h-96 -top-16 left-0 bg-gradient-to-b from-[#FFFFFF]/75 to-transparent" /> */}
      <div className="z-10 relative container flex flex-col">
        <CollectionRenderer
          locked={lockedObjekts}
          artists={artists}
          address={user!.address}
        />
      </div>
    </main>
  );
}
