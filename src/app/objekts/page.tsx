import ObjektIndexRenderer from "@/components/objekt-index/objekt-index-renderer";
import { cacheMembers } from "@/lib/server/cache";
import { Metadata } from "next";

export const runtime = "edge";
export const metadata: Metadata = {
  title: "Objekts",
};

export default async function CollectionPage() {
  const artists = await cacheMembers();

  return (
    <main className="relative py-2">
      <div className="relative container flex flex-col">
        <ObjektIndexRenderer artists={artists} />
      </div>
    </main>
  );
}
