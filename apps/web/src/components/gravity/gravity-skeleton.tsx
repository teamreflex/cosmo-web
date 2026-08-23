import SkeletonGradient from "../skeleton/skeleton-overlay";
import { Skeleton } from "../ui/skeleton";

export default function GravitySkeleton() {
  return (
    <div className="relative flex w-full flex-col gap-2">
      <SkeletonGradient />

      {/* chart card */}
      <Skeleton className="h-56 w-full rounded-md" />

      <div className="grid items-start gap-2 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* races */}
        <Skeleton className="h-96 w-full rounded-lg" />
        {/* rail */}
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    </div>
  );
}
