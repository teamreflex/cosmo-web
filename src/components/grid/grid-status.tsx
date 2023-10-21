import { decodeUser } from "@/app/(core)/data-fetching";
import { ValidArtist, fetchGridStatus } from "@/lib/server/cosmo";

export default async function GridStatus({ artist }: { artist: ValidArtist }) {
  const user = await decodeUser();
  const status = await fetchGridStatus(user!.accessToken, artist);

  return (
    <div className="bg-accent rounded-lg grid grid-cols-2 divide-x divide-background w-full sm:w-1/2">
      {/* completed */}
      <div className="flex flex-col items-center justify-center p-2">
        <p className="font-bold text-sm">Completed Grid</p>
        <p className="text-2xl text-cosmo-text font-bold">
          {status.totalCompletedGrids}
        </p>
      </div>

      {/* total obtained */}
      <div className="flex flex-col items-center justify-center p-2">
        <p className="font-bold text-sm">Total Special Objekts</p>
        <p className="text-2xl text-cosmo-text font-bold">
          {status.totalSpecialObjekts}
        </p>
      </div>
    </div>
  );
}

export function GridStatusSkeleton() {
  return (
    <div className="bg-accent rounded-lg grid grid-cols-2 divide-x divide-background w-full sm:w-1/2 animate-pulse">
      <div className="flex flex-col items-center justify-center p-2 h-[4.5rem]"></div>
      <div className="flex flex-col items-center justify-center p-2 h-[4.5rem]"></div>
    </div>
  );
}
