import Skeleton from "@/components/skeleton/skeleton";

export default async function ActivityLoading() {
  return (
    <main className="container flex flex-col gap-2 py-2">
      {/* header */}
      <div className="flex items-center">
        <div className="w-full flex gap-2 items-center justify-between">
          <h1 className="text-3xl font-cosmo uppercase">Activity</h1>

          <Skeleton className="w-10 h-10 rounded-full animate-pulse" />
        </div>
      </div>

      {/* content */}
      <div className="w-full sm:w-2/3 md:w-1/2 flex flex-col gap-4 mx-auto">
        <HistoryBlockSkeleton />
        <div className="grid grid-cols-2 gap-4">
          <ArtistBlockSkeleton />
          <BadgeBlockSkeleton />
        </div>
        <Skeleton className="w-full h-[21.5rem]" />
        <ObjektBlockSkeleton />
      </div>
    </main>
  );
}

export function ArtistBlockSkeleton() {
  return <Skeleton className="w-full rounded-xl aspect-square" />;
}

export function BadgeBlockSkeleton() {
  return <Skeleton className="w-full rounded-xl aspect-square" />;
}

export function ObjektBlockSkeleton() {
  return <Skeleton className="w-full rounded-xl h-56" />;
}

export function HistoryBlockSkeleton() {
  return <Skeleton className="w-full rounded-xl h-16" />;
}

export function RankingBlockSkeleton() {
  return <Skeleton className="w-full h-86" />;
}
