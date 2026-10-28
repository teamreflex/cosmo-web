import { Skeleton } from "../ui/skeleton";
import { SideHeadingSkeleton } from "./side-heading";

/**
 * The asking half while the listing loads.
 */
export default function WantsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <SideHeadingSkeleton />
      <Skeleton className="h-28 w-full rounded-lg" />
      <Skeleton className="h-28 w-full rounded-lg" />
    </div>
  );
}
