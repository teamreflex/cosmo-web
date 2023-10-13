import { cacheMembers, fetchLockedObjekts } from "@/lib/server/cache";
import { readToken } from "@/lib/server/jwt";
import { cookies } from "next/headers";
import CollectionRenderer from "@/components/collection/collection-renderer";
import { Metadata } from "next";

export const runtime = "edge";
export const metadata: Metadata = {
  title: "Collection",
};

export default async function CollectionPage() {
  const user = await readToken(cookies().get("token")?.value);

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
