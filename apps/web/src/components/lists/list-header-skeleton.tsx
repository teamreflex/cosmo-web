import { Skeleton } from "../ui/skeleton";

export default function ListHeaderSkeleton() {
  return (
    <div className="min-h-40 py-4">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
        <div className="flex items-start gap-4">
          <Skeleton className="size-10 shrink-0 rounded-sm md:size-14" />

          <div className="flex min-w-0 flex-col gap-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-6 w-56 md:h-[30px] md:w-72" />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
        <div className="flex h-[78px] flex-col gap-2 border-l-2 border-border pl-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-full max-w-[62ch]" />
          <Skeleton className="h-4 w-3/4 max-w-[46ch]" />
        </div>
        <div className="flex flex-col gap-2 md:min-w-[320px]">
          <Skeleton className="h-3 w-32" />
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-sm" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
