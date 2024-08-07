import Skeleton from "@/components/skeleton/skeleton";

export default async function ActivityBadgesLoading() {
  return (
    <main className="container flex flex-col gap-2 py-2">
      {/* header */}
      <div className="flex items-center">
        <div className="w-full flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
          <h1 className="text-3xl font-cosmo uppercase">Badges</h1>
        </div>
      </div>

      {/* content */}
      <div className="w-full sm:w-2/3 md:w-1/2 flex flex-col gap-4 mx-auto">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="w-full rounded-xl aspect-square" />
          <Skeleton className="w-full rounded-xl aspect-square" />
        </div>
      </div>
    </main>
  );
}
