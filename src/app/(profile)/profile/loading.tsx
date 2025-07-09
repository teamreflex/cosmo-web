import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLayoutLoading() {
  return (
    <main className="relative container flex flex-col py-2">
      <div className="grid grid-rows-[auto_auto_min-content] grid-cols-2 md:grid-cols-3 gap-2 md:h-24">
        {/* user block */}
        <div className="row-span-2 md:row-span-3 flex flex-row gap-4">
          <Skeleton className="h-24 w-24 rounded-full aspect-square" />

          <div className="flex flex-row">
            <div className="flex flex-col gap-2 justify-center h-24">
              {/* username */}
              <Skeleton className="rounded-full w-24 h-6 py-0.5" />

              {/* como balance */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-[26px] w-16 rounded-lg" />
                <Skeleton className="h-[26px] w-16 rounded-lg" />
              </div>

              {/* badges */}
              <div className="flex flex-row gap-2 h-5">
                <Skeleton className="h-4 w-4 aspect-square shrink-0 rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* profile-related buttons */}
        <div className="row-start-3 md:row-start-auto col-span-3 md:col-span-2 flex flex-wrap gap-2 justify-center md:justify-end">
          {/* copy address */}
          <Skeleton className="rounded-full w-10 h-10 lg:w-[84px] lg:h-8 shrink-0" />
          {/* trades */}
          <Skeleton className="rounded-full w-10 h-10 lg:w-[75px] lg:h-8 shrink-0" />
          {/* como */}
          <Skeleton className="rounded-full w-10 h-10 lg:w-[75px] lg:h-8 shrink-0" />
          {/* progress */}
          <Skeleton className="rounded-full w-10 h-10 lg:w-[88px] lg:h-8 shrink-0" />
          {/* lists */}
          <Skeleton className="rounded-full w-10 h-10 lg:w-[63px] lg:h-8 shrink-0" />
          {/* help */}
          <Skeleton className="rounded-full aspect-square h-10 lg:h-8 shrink-0" />
          {/* filters */}
          <Skeleton className="rounded-full flex w-10 h-10 lg:hidden lg:w-[89px] lg:h-8 shrink-0" />
        </div>

        {/* objekt total, gets portaled in */}
        <div className="flex col-start-3 row-start-2 md:row-start-3 h-6 place-self-end">
          <span id="objekt-total" />
        </div>
      </div>
    </main>
  );
}
