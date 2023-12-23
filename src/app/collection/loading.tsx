import { Loader } from "@/components/loader";
import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import Skeleton from "@/components/skeleton/skeleton";
import { AlertCircle } from "lucide-react";

export default function CollectionLoading() {
  return (
    <div className="container flex flex-col py-2">
      <div className="flex flex-col sm:gap-2 group" data-show={false}>
        {/* header */}
        <div className="flex items-center justify-between pb-2 sm:pb-0">
          {/* title */}
          <div className="flex gap-2 items-center">
            <h1 className="text-3xl font-cosmo uppercase drop-shadow-lg">
              Collect
            </h1>
            <AlertCircle className="w-4 h-4 drop-shadow-lg" />
          </div>

          {/* desktop: options */}
          <div className="hidden sm:flex items-center gap-2">
            {/* copy address button */}
            <Skeleton className="w-28 h-9" />
            {/* polygon button */}
            <Skeleton className="w-28 h-9" />
            {/* opensea button */}
            <Skeleton className="w-28 h-9" />
          </div>

          {/* mobile: options */}
          <div className="flex sm:hidden items-center gap-2">
            {/* show filters */}
            <Skeleton className="w-8 h-8" />
            {/* options dropdown */}
            <Skeleton className="w-8 h-8" />
          </div>
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
