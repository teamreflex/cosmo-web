import Skeleton from "@/components/skeleton/skeleton";

export default function ProfileLayoutLoading() {
  return (
    <main className="container flex flex-col gap-2 sm:gap-0 py-2">
      <div className="flex gap-4 items-center h-fit">
        <Skeleton className="h-24 w-24 rounded-full" />

        <div className="flex flex-col w-full">
          {/* nickname & como */}
          <div className="flex flex-wrap items-center justify-between">
            <Skeleton className="w-24 h-8 sm:h-9" />

            <div className="flex items-center gap-2">
              <Skeleton className="h-[26px] w-16 rounded" />
              <Skeleton className="h-[26px] w-16 rounded" />
            </div>
          </div>

          {/* buttons */}
          <div className="flex flex-wrap gap-2 py-1">
            <Skeleton className="rounded-full h-10 w-10" />
            <Skeleton className="rounded-full h-10 w-10" />
            <Skeleton className="rounded-full h-10 w-10" />
            <Skeleton className="rounded-full h-10 w-10" />
            <Skeleton className="rounded-full h-10 w-10" />
            <Skeleton className="rounded-full h-10 w-10" />
            <Skeleton className="rounded-full h-10 w-10" />
            <span className="h-10 flex items-center sm:hidden">
              <Skeleton className="rounded-full h-9 w-16" />
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
