import HelpDialog from "@/components/collection/help-dialog";
import { Loader } from "@/components/loader";
import { PropsWithClassName, cn } from "@/lib/utils";

export default function OtherCollectionLoading() {
  return (
    <div className="container flex flex-col py-2">
      <div
        className="flex flex-col sm:flex-row justify-between group"
        data-show={false}
      >
        {/* header */}
        <div className="flex items-center justify-between pb-2 sm:pb-0">
          {/* title */}
          <div className="flex gap-2 items-center">
            <h1 className="text-3xl font-cosmo uppercase">Collect</h1>
            <HelpDialog />
          </div>

          {/* mobile: show filters */}
          <div className="flex sm:hidden items-center">
            <Skeleton className="w-8 h-8" />
          </div>
        </div>

        {/* filters */}
        <div className="transition-all flex sm:group-data-[show=false]:visible sm:group-data-[show=true]:visible sm:group-data-[show=false]:opacity-100 sm:group-data-[show=true]:opacity-100 group-data-[show=true]:pb-2 sm:pb-1 sm:group-data-[show=false]:h-12 sm:group-data-[show=true]:h-12 group-data-[show=false]:h-0 group-data-[show=false]:invisible group-data-[show=false]:opacity-0 group-data-[show=true]:h-36 gap-2 items-center flex-wrap justify-center">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="w-24 h-10" />
          ))}
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex flex-row gap-2 pt-1 pb-1 px-1 h-fit sm:justify-center justify-items-start overflow-x-scroll no-scrollbar">
          {Array.from({ length: 24 }).map((_, i) => (
            <Skeleton key={i} className="w-10 h-10 rounded-full" />
          ))}
        </div>
        <div className="flex flex-col items-center">
          <div className="grid grid-cols-3 md:grid-cols-4 gap-4 py-2">
            <Loader className="col-span-full" />
          </div>
        </div>
      </div>
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
