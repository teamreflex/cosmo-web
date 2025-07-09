import MemberFilterSkeleton from "@/components/skeleton/member-filter-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { TransfersSkeleton } from "@/components/transfers/transfers-renderer";

export default function UserTransfersLoading() {
  return (
    <div className="flex flex-col">
      {/* FiltersContainer */}
      <div className="flex flex-col gap-2 sm:pb-2 pb-1">
        <div className="sm:flex gap-2 items-center flex-wrap justify-center hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-24 h-9" />
          ))}
        </div>
      </div>

      <MemberFilterSkeleton />

      <div className="pt-2">
        <TransfersSkeleton />
      </div>
    </div>
  );
}
