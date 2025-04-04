import { Metadata } from "next";
import BestRekord from "@/components/rekord/best-rekord";
import { Suspense } from "react";
import Skeleton from "@/components/skeleton/skeleton";
import { Flag } from "lucide-react";
import AllRekords from "@/components/rekord/all-rekords";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getSelectedArtist } from "../data-fetching";

export const metadata: Metadata = {
  title: "Rekord",
};

export default async function RekordPage() {
  const artist = await getSelectedArtist();

  return (
    <main className="container flex flex-col py-2">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-cosmo uppercase">Rekord</h1>

        <div className="flex gap-2 items-center">
          <Button variant="secondary" size="sm" asChild>
            <Link href="/rekord/my">My Rekord</Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/rekord/archive">Archive</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 py-2">
        {/* best rekord */}
        <div className="flex flex-col gap-2 w-full overflow-x-hidden">
          {/* header */}
          <div className="flex flex-row justify-between items-center">
            <div className="flex flex-row gap-2 items-center">
              <Flag className="w-6 h-6 fill-foreground" />
              <h2 className="font-semibold text-xl">Best Rekord</h2>
            </div>
          </div>

          <Suspense fallback={<RekordSkeleton />}>
            <BestRekord artist={artist} />
          </Suspense>
        </div>

        {/* view all rekords */}
        <div className="flex flex-col gap-2 w-full overflow-x-hidden">
          <h3 className="text-lg font-semibold">View all Rekords</h3>

          <AllRekords artist={artist} />
        </div>
      </div>
    </main>
  );
}

function RekordSkeleton() {
  return (
    <div className="flex flex-row gap-2 justify-center">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="w-32 h-[198px]" />
      ))}
    </div>
  );
}
