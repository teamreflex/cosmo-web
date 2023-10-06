import { ValidArtist, fetchGridStatus } from "@/lib/server/cosmo";
import { readToken } from "@/lib/server/jwt";
import { cookies } from "next/headers";

export default async function GridStatus({ artist }: { artist: ValidArtist }) {
  const user = await readToken(cookies().get("token")?.value);
  const status = await fetchGridStatus(user!.cosmoToken, artist);

  return (
    <div className="bg-accent rounded-lg grid grid-cols-2 divide-x divide-background w-full sm:w-1/2">
      {/* completed */}
      <div className="flex flex-col items-center justify-center p-2">
        <p>Completed Grid</p>
        <p className="text-2xl text-cosmo-text font-bold">
          {status.totalCompletedGrids}
        </p>
      </div>

      {/* total obtained */}
      <div className="flex flex-col items-center justify-center p-2">
        <p>Total Special Objekts</p>
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
