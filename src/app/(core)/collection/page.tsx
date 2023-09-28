import { fetchLockedObjekts } from "@/lib/server/cache";
import { fetchArtist } from "@/lib/server/cosmo";
import { validArtists } from "@/lib/server/cosmo/common";
import { readToken } from "@/lib/server/jwt";
import { cookies } from "next/headers";
import { cache } from "react";
import CollectionRenderer from "@/components/collection/collection-renderer";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const fetchData = cache(
  async (userId: number) =>
    await Promise.all([
      fetchLockedObjekts(userId),
      ...validArtists.map((artist) => fetchArtist(artist)),
    ])
);

export default async function CollectionPage() {
  const user = await readToken(cookies().get("token")?.value);

  const [lockedObjekts, ...artists] = await fetchData(user!.id);

  return (
    <main className="container flex flex-col py-2">
      <CollectionRenderer locked={lockedObjekts} artists={artists} />
    </main>
  );
}
