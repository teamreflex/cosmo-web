import { fetchLockedObjekts } from "@/lib/server/cache";
import { fetchArtist } from "@/lib/server/cosmo";
import { validArtists } from "@/lib/server/cosmo/common";
import { readToken } from "@/lib/server/jwt";
import { cookies } from "next/headers";
import { cache } from "react";
import CollectionRenderer from "@/components/collection/collection-renderer";
import { Metadata } from "next";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const runtime = "edge";
export const metadata: Metadata = {
  title: "Collection",
};

const fetchData = cache(
  async (userId: number) =>
    await Promise.all([
      fetchLockedObjekts(userId),
      ...validArtists.map((artist) => fetchArtist(artist)),
    ])
);

export default async function CollectionPage() {
  const user = await readToken(cookies().get("token")?.value);

  await delay(2000);

  const [lockedObjekts, ...artists] = await fetchData(user!.id);

  return (
    <main className="container flex flex-col py-2">
      <CollectionRenderer locked={lockedObjekts} artists={artists} />
    </main>
  );
}
