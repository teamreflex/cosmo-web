import { Skeleton } from "../ui/skeleton";

export default function MemberFilterSkeleton() {
  return (
    <div className="flex w-full items-center justify-center gap-2 py-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-10 rounded-full" />
      ))}
    </div>
  );
}
