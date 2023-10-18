import { Metadata } from "next";
import { cache } from "react";
import { fetchSelectedArtist } from "@/lib/server/cache";
import { fetchGravity } from "@/lib/server/cosmo";
import GravityBodyRenderer from "@/components/gravity/gravity-body-renderer";
import GravityCoreDetails from "@/components/gravity/gravity-core-details";
import { redirect } from "next/navigation";
import { decodeUser } from "../../data-fetching";

export const runtime = "edge";

const fetchData = cache(async (gravity: number) => {
  const user = await decodeUser();
  const selectedArtist = await fetchSelectedArtist(user!.id);

  return await fetchGravity(
    user!.cosmoToken,
    selectedArtist ?? "artms",
    gravity
  );
});

export async function generateMetadata({
  params,
}: {
  params: { gravity: number };
}): Promise<Metadata> {
  const gravity = await fetchData(params.gravity);

  return {
    title: gravity?.title ?? "Gravity",
  };
}

export default async function GravityPage({
  params,
}: {
  params: { gravity: number };
}) {
  const gravity = await fetchData(params.gravity);
  if (!gravity) {
    redirect("/gravity");
  }

  return (
    <main className="container flex flex-col py-2">
      <div className="flex items-center">
        <div className="flex gap-2 items-center">
          <h1 className="text-3xl font-cosmo uppercase">Gravity</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* core details */}
        <div className="col-span-1 sm:col-span-2">
          <GravityCoreDetails gravity={gravity} />
        </div>

        {/* dynamic details */}
        <div className="col-span-1">
          <GravityBodyRenderer gravity={gravity} />
        </div>
      </div>
    </main>
  );
}
