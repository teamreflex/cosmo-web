import { cacheMembers } from "@/lib/server/cache/available-artists";
import { Metadata } from "next";
import { decodeUser } from "../data-fetching";
import IndexRenderer from "@/components/objekt-index/index-renderer";
import { fetchUniqueCollections } from "@/lib/server/objekts/collections";
import { fetchObjektLists } from "@/lib/server/objekts/lists";

export const metadata: Metadata = {
  title: "Objekts",
};

export default async function ObjektsIndexPage() {
  const user = await decodeUser();
  const [objektLists, artists, collections] = await Promise.all([
    user ? fetchObjektLists(user.address) : undefined,
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
