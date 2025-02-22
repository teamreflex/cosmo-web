import Skeleton from "@/components/skeleton/skeleton";
import SkeletonGradient from "@/components/skeleton/skeleton-overlay";

export default function VotingLoading() {
  return (
    <div className="relative">
      <SkeletonGradient />
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-62 flex flex-col rounded-lg overflow-hidden bg-accent w-full md:w-1/2 md:mx-auto"
          />
        ))}
      </div>
    </div>
  );
}
