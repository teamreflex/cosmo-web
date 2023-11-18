import ObjektIndexRenderer from "@/components/objekt-index/objekt-index-renderer";
import { cacheMembers } from "@/lib/server/cache";
import { Metadata } from "next";
import { decodeUser, fetchObjektListsForUser } from "../data-fetching";

export const metadata: Metadata = {
  title: "Objekts",
};

export default async function ObjektsIndexPage() {
  const user = await decodeUser();
  const [objektLists, artists] = await Promise.all([
    fetchObjektListsForUser(user?.address),
    cacheMembers(),
  ]);

  return (
    <main className="relative py-2">
      <div className="relative container flex flex-col">
        <ObjektIndexRenderer
          artists={artists}
          objektLists={objektLists}
          nickname={user?.nickname}
        />
      </div>
    </main>
  );
}
