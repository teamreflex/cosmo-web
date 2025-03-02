import { Metadata } from "next";
import {
  decodeUser,
  getArtistsWithMembers,
  getSelectedArtist,
  getUserByIdentifier,
} from "../data-fetching";
import { redirect } from "next/navigation";
import { UserStateProvider } from "@/hooks/use-user-state";
import { Suspense } from "react";
import AvailableTickets from "@/components/spin/available-tickets";
import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import { ProfileProvider } from "@/hooks/use-profile";
import SpinContainer from "@/components/spin/spin-container";

export const metadata: Metadata = {
  title: "Objekt Spin",
};

export default async function SpinPage() {
  const user = await decodeUser();
  if (!user) redirect("/");

  const [selectedArtist, artists, currentUser] = await Promise.all([
    getSelectedArtist(),
    getArtistsWithMembers(),
    getUserByIdentifier(user.address),
  ]);

  // we only want to show the selected artist
  const filteredArtists = artists.filter(
    (a) => a.name.toLowerCase() === selectedArtist.toLowerCase()
  );

  return (
    <UserStateProvider token={user} artist={selectedArtist}>
      <CosmoArtistProvider artists={filteredArtists}>
        <ProfileProvider
          currentProfile={currentUser.profile}
          lockedObjekts={currentUser.lockedObjekts}
        >
          <main className="container flex flex-col py-2">
            {/* header */}
            <div className="flex gap-2 items-center w-full pb-1 justify-between">
              <h1 className="text-3xl font-cosmo uppercase drop-shadow-lg">
                Spin
              </h1>

              <Suspense fallback={<div>Loading...</div>}>
                <AvailableTickets
                  token={user.accessToken}
                  artist={selectedArtist}
                />
              </Suspense>
            </div>

            {/* content */}
            <SpinContainer currentUser={currentUser.profile} />
          </main>
        </ProfileProvider>
      </CosmoArtistProvider>
    </UserStateProvider>
  );
}
