import { Loader } from "@/components/loader";
import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import Skeleton from "@/components/skeleton/skeleton";

export default function UserCollectionLoading() {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col group" data-show={false}>
        <div className="flex sm:hidden justify-center items-center gap-2 pb-2">
          <Skeleton className="w-8 h-8" />
          <Skeleton className="w-8 h-8" />
        </div>

        {/* filters */}
        <div className="transition-all flex sm:group-data-[show=false]:visible sm:group-data-[show=true]:visible sm:group-data-[show=false]:opacity-100 sm:group-data-[show=true]:opacity-100 group-data-[show=true]:pb-2 sm:pb-1 sm:group-data-[show=false]:h-12 sm:group-data-[show=true]:h-12 group-data-[show=false]:h-0 group-data-[show=false]:invisible group-data-[show=false]:opacity-0 group-data-[show=true]:h-36 gap-2 items-center flex-wrap justify-center">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="w-24 h-10" />
          ))}
        </div>
      </div>

      <div className="flex flex-col">
        <MemberFilterSkeleton />
        <div className="flex flex-col items-center">
          <div className="grid grid-cols-3 md:grid-cols-4 gap-4 py-2">
            <Loader className="col-span-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
