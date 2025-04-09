import Skeleton from "@/components/skeleton/skeleton";
import SkeletonGradient from "@/components/skeleton/skeleton-overlay";

export default async function ActivityRankingLoading() {
  return (
    <main className="container flex flex-col gap-2 py-2">
      {/* header */}
      <div className="flex items-center">
        <div className="w-full flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
          <h1 className="text-3xl font-cosmo uppercase">Ranking</h1>

          <div className="flex items-center justify-center md:justify-normal gap-2">
            <Skeleton className="w-36 h-9" />
            <Skeleton className="w-32 h-9" />
          </div>
        </div>
      </div>

      {/* content */}
      <div className="w-full sm:w-2/3 md:w-1/2 flex flex-col mx-auto">
        <div className="relative flex flex-col gap-4">
          <SkeletonGradient />

          {/* my rank */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xl font-semibold">My Rank</h3>
            <Skeleton className="h-[218px] rounded-lg" />
          </div>

          {/* top 10 */}
          <div className="flex flex-col gap-2">
            <h3 className="z-30 text-xl font-semibold">TOP 10</h3>
            <div className="flex flex-col gap-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex gap-4 items-center">
                  {/* ranking position */}
                  <Skeleton className="w-5 h-5 rounded-full" />

                  {/* profile image */}
                  <Skeleton className="h-10 w-10 rounded-full" />

                  {/* name */}
                  <div className="grow">
                    <Skeleton className="h-3 w-24 rounded-full" />
                  </div>

                  {/* ranking data */}
                  <Skeleton className="w-5 h-5 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
