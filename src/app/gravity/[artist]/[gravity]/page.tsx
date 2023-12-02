import { Metadata } from "next";
import { cache } from "react";
import { fetchGravity } from "@/lib/server/cosmo/gravity";
import GravityBodyRenderer from "@/components/gravity/gravity-body-renderer";
import GravityCoreDetails from "@/components/gravity/gravity-core-details";
import { redirect } from "next/navigation";
import { decodeUser } from "../../../data-fetching";
import { ValidArtist } from "@/lib/universal/cosmo/common";

type Params = {
  artist: ValidArtist;
  gravity: number;
};

const fetchData = cache(async ({ artist, gravity }: Params) => {
  const user = await decodeUser();
  return await fetchGravity(user!.accessToken, artist, gravity);
});

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const gravity = await fetchData(params);

  return {
    title: gravity?.title ?? "Gravity",
  };
}

export default async function GravityPage({ params }: { params: Params }) {
  const gravity = await fetchData(params);
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
