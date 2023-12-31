import { Metadata } from "next";
import { decodeUser } from "../data-fetching";
import IndexRenderer from "@/components/objekt-index/index-renderer";
import { fetchUniqueCollections } from "@/lib/server/objekts/collections";
import { fetchObjektLists } from "@/lib/server/objekts/lists";
import { fetchArtistsWithMembers } from "@/lib/server/cosmo/artists";

export const metadata: Metadata = {
  title: "Objekts",
};

export default async function ObjektsIndexPage() {
  const user = await decodeUser();
  const [objektLists, artists, collections] = await Promise.all([
    user ? fetchObjektLists(user.address) : undefined,
    fetchArtistsWithMembers(),
    fetchUniqueCollections(),
  ]);

  return (
    <main className="container flex flex-col py-2">
      <IndexRenderer
        artists={artists}
        collections={collections}
        objektLists={objektLists}
        nickname={user?.nickname}
      />
    </main>
  );
}
