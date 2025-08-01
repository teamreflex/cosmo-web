import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ObjektsLoading() {
  return (
    <div className="container flex flex-col py-2">
      <div className="flex flex-col">
        {/* Title */}
        <div className="flex gap-2 items-center w-full pb-1">
          <div className="flex gap-2 items-center h-9">
            <h1 className="text-2xl md:text-3xl font-cosmo uppercase">
              Objekts
            </h1>
          </div>
        </div>

        {/* FiltersContainer */}
        <div className="flex flex-col gap-2 group lg:pb-2 pb-0">
          <div className="flex flex-row items-center justify-center gap-2 sm:hidden">
            <Skeleton className="w-20 h-9 rounded-full" />
          </div>

          <div className="sm:flex gap-2 items-center flex-wrap justify-center hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="w-24 h-9" />
            ))}
            <Skeleton className="w-48 h-9" />
            <Skeleton className="w-[42px] h-[36px]" />
          </div>
        </div>

        {/* FilteredObjektDisplay */}
        <div className="flex flex-col">
          <MemberFilterSkeleton />
        </div>
      </div>
    </div>
  );
}
