import { PropsWithClassName, cn } from "@/lib/utils";

export default function UserTransfersLoading() {
  return (
    <div className="container flex flex-col gap-2 py-2">
      <div className="flex flex-col">
        {/* header */}
        <div className="flex items-center justify-between pb-2 sm:pb-0">
          {/* title */}
          <div className="flex gap-2 items-center">
            <h1 className="text-3xl font-cosmo uppercase drop-shadow-lg">
              Trades
            </h1>
          </div>

          {/* desktop: options */}
          <div className="hidden sm:flex items-center gap-2">
            {/* profile button */}
            <Skeleton className="w-24 h-9" />
          </div>

          {/* mobile: options */}
          <div className="flex sm:hidden items-center gap-2">
            {/* profile */}
            <Skeleton className="w-8 h-8" />
          </div>
        </div>
      </div>

      <Skeleton className="w-full h-48" />
    </div>
  );
}

function Skeleton({ className }: PropsWithClassName<{}>) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-accent shrink-0", className)}
    />
  );
}
