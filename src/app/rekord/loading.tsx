import Skeleton from "@/components/skeleton/skeleton";

export default async function RekordLoading() {
  return (
    <main className="container flex flex-col py-2">
      <div className="flex items-center">
        <div className="flex gap-2 items-center">
          <h1 className="text-3xl font-cosmo uppercase">Rekord</h1>
        </div>
      </div>

      <div className="flex flex-col gap-2 items-center py-6">
        <Skeleton className="h-36 w-36" />
      </div>
    </main>
  );
}
