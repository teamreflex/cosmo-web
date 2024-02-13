import Skeleton from "@/components/skeleton/skeleton";

export default function MyRekordLoading() {
  return (
    <main className="container flex flex-col py-2">
      <div className="flex items-center">
        <div className="flex gap-2 items-center">
          <h1 className="text-3xl font-cosmo uppercase">My Rekord</h1>
        </div>
      </div>

      <div className="flex flex-col gap-4 py-2 w-full">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 justify-center">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-[316px] aspect-photocard" />
          ))}
        </div>
      </div>
    </main>
  );
}
