import { GravitySkeleton } from "@/components/gravity/gravity-renderer";

export default function GravityLoading() {
  return (
    <main className="container flex flex-col py-2">
      <div className="flex items-center">
        <div className="flex gap-2 items-center">
          <h1 className="text-3xl font-cosmo uppercase">Gravity</h1>
        </div>
      </div>

      <GravitySkeleton />
    </main>
  );
}
