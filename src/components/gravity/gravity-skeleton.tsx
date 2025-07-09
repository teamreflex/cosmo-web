import { Skeleton } from "../ui/skeleton";
import SkeletonGradient from "../skeleton/skeleton-overlay";

export default function GravitySkeleton() {
  return (
    <div className="relative flex flex-col w-full gap-2">
      <SkeletonGradient />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="w-full h-16 rounded-lg" />
      ))}
    </div>
  );
}
