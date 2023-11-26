import { Metadata } from "next";
import { Suspense } from "react";
import GridStatus, { GridStatusSkeleton } from "@/components/grid/grid-status";
import GridEditions, {
  GridEditionsSkeleton,
} from "@/components/grid/grid-editions";
import { decodeUser, getProfile } from "../data-fetching";

export const metadata: Metadata = {
  title: "Grid",
};

export default async function GridPage() {
  const user = await decodeUser();
  const profile = await getProfile(user!.profileId);

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
          <GridStatus artist={profile.artist} />
        </Suspense>

        {/* available editions */}
        <Suspense fallback={<GridEditionsSkeleton />}>
          <GridEditions artist={profile.artist} />
        </Suspense>
      </div>
    </main>
  );
}
