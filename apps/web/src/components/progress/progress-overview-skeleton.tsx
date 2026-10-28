import SkeletonGradient from "@/components/skeleton/skeleton-overlay";
import { Skeleton } from "@/components/ui/skeleton";
import { TOP_MEMBERS } from "./common";

export default function ProgressOverviewSkeleton() {
  return (
    <div className="relative flex flex-col gap-8">
      <SkeletonGradient />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: TOP_MEMBERS }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl sm:h-52" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}
