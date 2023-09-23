import ObjektList from "@/components/collection/objekt-list";
import { fetchLockedObjekts } from "@/lib/server/cache";
import { fetchArtist } from "@/lib/server/cosmo";
import { validArtists } from "@/lib/server/cosmo/common";
import { readToken } from "@/lib/server/jwt";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

export const dynamic = "force-dynamic";

const fetchData = cache(
  async (userId: number) =>
    await Promise.all([
      fetchLockedObjekts(userId),
      ...validArtists.map((artist) => fetchArtist(artist)),
    ])
);

export default async function CollectionPage() {
  const user = await readToken(cookies().get("token")?.value);
  if (!user) {
    redirect("/");
  }

  const [lockedObjekts, ...artists] = await fetchData(user.id);

  return (
    <main className="flex flex-col items-center">
      <ObjektList locked={lockedObjekts} artists={artists} />
    </main>
  );
}
