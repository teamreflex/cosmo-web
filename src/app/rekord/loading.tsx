import Skeleton from "@/components/skeleton/skeleton";
import { Flag } from "lucide-react";

export default async function RekordLoading() {
  return (
    <main className="container flex flex-col py-2">
      <div className="flex items-center">
        <h1 className="text-3xl font-cosmo uppercase">Rekord</h1>
      </div>

      <div className="flex flex-col gap-2 w-full overflow-x-hidden">
        {/* header */}
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-row gap-2 items-center">
            <Flag className="w-6 h-6 fill-foreground" />
            <h2 className="font-bold text-xl">Best Rekord</h2>
          </div>
        </div>

        <div className="flex flex-row gap-2 py-2 justify-center">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="w-32 h-[198px]" />
          ))}
        </div>
      </div>
    </main>
  );
}
