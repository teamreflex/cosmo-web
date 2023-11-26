import { Metadata } from "next";
import { Suspense } from "react";
import GravityRenderer, {
  GravitySkeleton,
} from "@/components/gravity/gravity-renderer";
import { decodeUser, getProfile } from "../data-fetching";

export const metadata: Metadata = {
  title: "Gravity",
};

export default async function GravityPage() {
  const user = await decodeUser();
  const profile = await getProfile(user!.profileId);

  return (
    <main className="container flex flex-col py-2">
      <div className="flex items-center">
        <div className="flex gap-2 items-center">
          <h1 className="text-3xl font-cosmo uppercase">Gravity</h1>
        </div>
      </div>

      <Suspense fallback={<GravitySkeleton />}>
        <GravityRenderer artist={profile.artist} />
      </Suspense>
    </main>
  );
}
