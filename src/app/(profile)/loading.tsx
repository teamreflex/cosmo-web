import Skeleton from "@/components/skeleton/skeleton";

export default function ProfileLayoutLoading() {
  return (
    <main className="relative container flex flex-col gap-2 py-2 lg:gap-0">
      {/* user block */}
      <div className="flex flex-col">
        <div className="flex flex-row gap-4 items-center">
          <Skeleton className="h-20 w-20 rounded-full aspect-square" />

          <div className="flex flex-col gap-1 justify-between w-full">
            <div className="flex gap-2 items-center justify-between">
              <Skeleton className="rounded-full w-20 h-8" />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-[26px] w-16 rounded" />
                <Skeleton className="h-[26px] w-16 rounded" />
              </div>
              <div id="objekt-total" className="h-10" />
            </div>
          </div>
        </div>
      </div>

      {/* mobile buttons */}
      <div className="button-container flex flex-wrap gap-2 justify-center lg:justify-normal">
        {/* copy address */}
        <Skeleton className="rounded-full w-10 h-10 lg:w-[122px] lg:h-8" />
        {/* trades */}
        <Skeleton className="rounded-full w-10 h-10 lg:w-[79px] lg:h-8" />
        {/* como */}
        <Skeleton className="rounded-full w-10 h-10 lg:w-[78px] lg:h-8" />
        {/* progress */}
        <Skeleton className="rounded-full w-10 h-10 lg:w-[91px] lg:h-8" />
        {/* lists */}
        <Skeleton className="rounded-full w-10 h-10 lg:w-[67px] lg:h-8" />
        {/* help */}
        <Skeleton className="rounded-full aspect-square h-10 lg:h-8" />
        {/* filters */}
        <Skeleton className="rounded-full flex w-10 h-10 lg:hidden lg:w-[89px] lg:h-8" />
      </div>
    </main>
  );
}
