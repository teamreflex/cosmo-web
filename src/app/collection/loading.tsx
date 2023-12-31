import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import Skeleton from "@/components/skeleton/skeleton";

export default function CollectionLoading() {
  return (
    <div className="container flex flex-col py-2">
      <div className="flex flex-col">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 pb-2">
          {/* Title */}
          <div className="flex gap-2 justify-between items-center w-full md:w-auto">
            <div className="flex gap-2 items-center h-10">
              <h1 className="text-3xl font-cosmo uppercase drop-shadow-lg">
                Collect
              </h1>
            </div>
          </div>

          {/* DesktopOptions */}
          <div className="hidden sm:flex items-center gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="w-10 h-10 rounded-full" />
            ))}
          </div>
        </div>

        {/* FiltersContainer */}
        <div className="flex flex-col gap-2 sm:pb-2 pb-1">
          <div className="flex flex-row items-center justify-center gap-2 sm:hidden">
            <Skeleton className="w-20 h-9 rounded-full" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="w-10 h-10 rounded-full" />
            ))}
          </div>

          <div className="sm:flex gap-2 items-center flex-wrap justify-center hidden">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="w-24 h-10" />
            ))}
          </div>
        </div>

        <MemberFilterSkeleton />
      </div>
    </div>
  );
}
