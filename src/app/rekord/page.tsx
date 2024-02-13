import { Metadata } from "next";
import { decodeUser, getProfile } from "../data-fetching";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import BestRekord from "@/components/rekord/best-rekord";
import { Suspense } from "react";
import Skeleton from "@/components/skeleton/skeleton";
import { Flag } from "lucide-react";

export const metadata: Metadata = {
  title: "Rekord",
};

export default async function RekordPage() {
  const user = await decodeUser();
  const profile = await getProfile(user!.profileId);

  return (
    <main className="container flex flex-col py-2">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-cosmo uppercase">Rekord</h1>

        <Button variant="secondary" size="sm" asChild>
          <Link href="/rekord/archive">Archive</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2 w-full overflow-x-hidden">
        {/* header */}
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-row gap-2 items-center">
            <Flag className="w-6 h-6 fill-foreground" />
            <h2 className="font-bold text-xl">Best Rekord</h2>
          </div>
        </div>

        <Suspense fallback={<RekordSkeleton />}>
          <BestRekord artist={profile.artist} />
        </Suspense>
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
