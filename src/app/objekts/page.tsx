import { cacheMembers } from "@/lib/server/cache";
import { Metadata } from "next";
import { decodeUser, getObjektListsForUser } from "../data-fetching";
import IndexRenderer from "@/components/objekt-index/index-renderer";
import { fetchUniqueCollections } from "@/lib/server/objekts/collections";

export const metadata: Metadata = {
  title: "Objekts",
};

export default async function ObjektsIndexPage() {
  const user = await decodeUser();
  const [objektLists, artists, collections] = await Promise.all([
    getObjektListsForUser(user?.address),
    cacheMembers(),
    fetchUniqueCollections(),
  ]);

  return (
    <main className="relative py-2">
      <div className="relative container flex flex-col">
        <IndexRenderer
          artists={artists}
          collections={collections}
          objektLists={objektLists}
          nickname={user?.nickname}
        />
      </div>
    </main>
  );
}
