import { Skeleton } from "@/components/ui/skeleton";
import SkeletonGradient from "@/components/skeleton/skeleton-overlay";

export default function GravityLoading() {
  return (
    <main className="container flex flex-col py-2">
      {/* header */}
      <div className="flex flex-row items-center justify-between">
        <h1 className="text-3xl font-cosmo uppercase">Gravity</h1>
        <Skeleton className="h-9 w-48 rounded-md" />
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-2 mt-2">
        <SkeletonGradient />
        {Array.from({ length: 12 }).map((_, index) => (
          <Skeleton
            key={index}
            className="aspect-square w-full rounded-xl shadow-sm"
          />
        ))}
      </div>
    </main>
  );
}
