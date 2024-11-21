import { Metadata } from "next";
import { Suspense } from "react";
import GridStatus, { GridStatusSkeleton } from "@/components/grid/grid-status";
import GridEditions, {
  GridEditionsSkeleton,
} from "@/components/grid/grid-editions";
import { decodeUser, getSelectedArtist } from "../data-fetching";
import ApolloErrorBoundary from "@/components/error-boundary";

export const metadata: Metadata = {
  title: "Grid",
};

export default async function GridPage() {
  const user = await decodeUser();
  const artist = await getSelectedArtist();

  return (
    <main className="container flex flex-col py-2">
      <div className="flex items-center">
        <div className="flex gap-2 items-center">
          <h1 className="text-3xl font-cosmo uppercase">Grid</h1>
        </div>
      </div>

      <div className="flex flex-col gap-4 items-center">
        <ApolloErrorBoundary message="Could not load grid">
          {/* grid status / completion totals */}
          <Suspense fallback={<GridStatusSkeleton />}>
            <GridStatus user={user!} artist={artist} />
          </Suspense>

          {/* available editions */}
          <Suspense fallback={<GridEditionsSkeleton />}>
            <GridEditions user={user!} artist={artist} />
          </Suspense>
        </ApolloErrorBoundary>
      </div>
    </main>
  );
}
