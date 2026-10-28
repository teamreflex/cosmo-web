import { Skeleton } from "../ui/skeleton";

export default function ListingHeaderSkeleton() {
  return (
    <div className="border-b border-border">
      <div className="container flex flex-wrap items-center gap-x-8 gap-y-3 py-3 md:py-3.5">
        <div className="flex min-w-0 flex-1 basis-105 items-center gap-3 md:gap-4">
          <Skeleton className="size-9 shrink-0 rounded-full md:size-10" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3.5 w-48" />
          </div>
        </div>
        <Skeleton className="h-10 w-full max-w-80 rounded-md" />
      </div>
    </div>
  );
}
