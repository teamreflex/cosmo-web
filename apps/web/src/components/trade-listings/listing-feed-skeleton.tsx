import SkeletonGradient from "../skeleton/skeleton-overlay";
import { Skeleton } from "../ui/skeleton";
import ListingFeedHeader from "./listing-feed-header";

export default function ListingFeedSkeleton() {
  return (
    <div className="relative">
      <SkeletonGradient />

      <div className="relative flex flex-col gap-2.5 md:gap-0 md:overflow-clip md:rounded-lg md:border md:bg-card">
        <ListingFeedHeader />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-51.5 w-full rounded-[10px] md:h-30 md:rounded-none md:border-t md:first:border-t-0 lg:h-21"
          />
        ))}
      </div>
    </div>
  );
}
