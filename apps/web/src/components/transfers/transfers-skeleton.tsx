import SkeletonGradient from "../skeleton/skeleton-overlay";
import { Skeleton } from "../ui/skeleton";
import TransferHeader from "./transfer-header";

export default function TransfersSkeleton() {
  return (
    <div className="relative">
      <SkeletonGradient />

      <div className="relative flex w-full flex-col overflow-clip rounded-lg border bg-card text-sm">
        <TransferHeader />

        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-19 w-full rounded-none border-t" />
        ))}
      </div>
    </div>
  );
}
