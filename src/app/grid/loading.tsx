import { GridEditionsSkeleton } from "@/components/grid/grid-editions";
import { GridStatusSkeleton } from "@/components/grid/grid-status";

export default async function GridLoading() {
  return (
    <main className="container flex flex-col py-2">
      <div className="flex items-center">
        <div className="flex gap-2 items-center">
          <h1 className="text-3xl font-cosmo uppercase">Grid</h1>
        </div>
      </div>

      <div className="flex flex-col gap-4 items-center">
        <GridStatusSkeleton />
        <GridEditionsSkeleton />
      </div>
    </main>
  );
}
