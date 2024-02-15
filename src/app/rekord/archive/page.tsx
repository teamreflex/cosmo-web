import { decodeUser, getProfile } from "@/app/data-fetching";
import ArchiveRekords from "@/components/rekord/archive-rekords";
import RekordArchiveStatus from "@/components/rekord/archive-status";
import Skeleton from "@/components/skeleton/skeleton";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Rekord Archive",
};

export default async function RekordArchivePage() {
  const user = await decodeUser();
  const profile = await getProfile(user!.profileId);

  return (
    <main className="container flex flex-col py-2 mx-auto w-full sm:w-1/2">
      <div className="flex flex-col gap-2">
        <Suspense fallback={<Skeleton className="w-full h-24" />}>
          <RekordArchiveStatus user={user!} artist={profile.artist} />
        </Suspense>

        <ArchiveRekords artist={profile.artist} />
      </div>
    </main>
  );
}
