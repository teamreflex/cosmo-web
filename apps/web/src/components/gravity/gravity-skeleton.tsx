import SkeletonGradient from "../skeleton/skeleton-overlay";
import { Skeleton } from "../ui/skeleton";

export default function GravitySkeleton() {
  return (
    <div className="relative flex w-full flex-col gap-2">
      <SkeletonGradient />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}
