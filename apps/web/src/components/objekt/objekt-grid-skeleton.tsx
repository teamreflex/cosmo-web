import SkeletonGradient from "../skeleton/skeleton-overlay";
import { Skeleton } from "../ui/skeleton";

export default function ObjektGridSkeleton(props: { gridColumns: number }) {
  return (
    <div
      style={{ "--grid-columns": props.gridColumns }}
      className="relative grid w-full grid-cols-3 gap-4 py-2 md:grid-cols-[repeat(var(--grid-columns),_minmax(0,_1fr))]"
    >
      <SkeletonGradient />
      {Array.from({ length: props.gridColumns * 3 }).map((_, i) => (
        <div key={i} className="@container">
          <Skeleton className="z-10 aspect-photocard w-full rounded-photocard" />
        </div>
      ))}
    </div>
  );
}
