import GravitySkeleton from "@/components/gravity/gravity-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function GravityLoading() {
  return (
    <main className="container flex flex-col py-2">
      {/* header */}
      <div className="flex flex-col pb-4">
        <h1 className="text-3xl font-cosmo uppercase">Gravity</h1>
        <Skeleton className="w-56 h-5 rounded-full" />
      </div>

      {/* content */}
      <GravitySkeleton />
    </main>
  );
}
