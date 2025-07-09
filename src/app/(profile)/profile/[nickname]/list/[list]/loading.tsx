import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ObjektListLoading() {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col group" data-show={false}>
        {/* title */}
        <div className="flex items-center h-10">
          <Skeleton className="rounded-full w-32 h-6" />
        </div>

        {/* filters */}
        <div className="transition-all flex sm:group-data-[show=false]:visible sm:group-data-[show=true]:visible sm:group-data-[show=false]:opacity-100 sm:group-data-[show=true]:opacity-100 group-data-[show=true]:pb-2 sm:pb-1 sm:group-data-[show=false]:h-12 sm:group-data-[show=true]:h-12 group-data-[show=false]:h-0 group-data-[show=false]:invisible group-data-[show=false]:opacity-0 group-data-[show=true]:h-36 gap-2 items-center flex-wrap justify-center">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="w-24 h-9" />
          ))}
        </div>
      </div>

      <div className="flex flex-col">
        <MemberFilterSkeleton />
      </div>
    </div>
  );
}
