import Skeleton from "@/components/skeleton/skeleton";

export default function GravityLoading() {
  return (
    <main className="container flex flex-col py-2">
      <div className="flex items-center">
        <div className="flex gap-2 items-center">
          <h1 className="text-3xl font-cosmo uppercase">Gravity</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* core details */}
        <div className="col-span-1 sm:col-span-2">
          <div className="flex flex-col gap-2 w-full">
            {/* title */}
            <Skeleton className="h-7 w-48" />
            <div className="flex gap-2 items-center">
              <Skeleton className="h-6 w-10" />
              <span>·</span>
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        </div>

        {/* dynamic details */}
        <div className="col-span-1">
          <div className="flex flex-col w-full justify-center mb-4">
            <Skeleton className="aspect-square h-48 w-full" />
          </div>
        </div>
      </div>
    </main>
  );
}
