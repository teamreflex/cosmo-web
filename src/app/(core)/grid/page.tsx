import { readToken } from "@/lib/server/jwt";
import { cookies } from "next/headers";
import { Metadata } from "next";
import { fetchSelectedArtistWithGrid } from "@/lib/server/cosmo";
import { Suspense } from "react";
import GridStatus, { GridStatusSkeleton } from "@/components/grid/grid-status";
import GridEditions, {
  GridEditionsSkeleton,
} from "@/components/grid/grid-editions";

export const runtime = "edge";
export const metadata: Metadata = {
  title: "Grid",
};

export default async function GridPage() {
  const user = await readToken(cookies().get("token")?.value);
  const { selectedArtist, cosmoArtist } = await fetchSelectedArtistWithGrid(
    user!.id
  );

  return (
    <main className="container flex flex-col py-2">
      <div className="flex items-center">
        <div className="flex gap-2 items-center">
          <h1 className="text-3xl font-cosmo uppercase">Grid</h1>
        </div>
      </div>

      <div className="flex flex-col gap-4 items-center">
        {/* grid status / completion totals */}
        <Suspense fallback={<GridStatusSkeleton />}>
          <GridStatus artist={selectedArtist} />
        </Suspense>

        {/* available editions */}
        <Suspense fallback={<GridEditionsSkeleton />}>
          <GridEditions artist={selectedArtist} />
        </Suspense>
      </div>
    </main>
  );
}
