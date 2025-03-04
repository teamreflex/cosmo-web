import { Metadata } from "next";
import {
  decodeUser,
  getArtistsWithMembers,
  getSeasons,
  getSelectedArtist,
  getUserByIdentifier,
} from "../data-fetching";
import { redirect } from "next/navigation";
import { UserStateProvider } from "@/hooks/use-user-state";
import AvailableTickets from "@/components/spin/available-tickets";
import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import { ProfileProvider } from "@/hooks/use-profile";
import SpinContainer from "@/components/spin/spin-container";
import SpinTicket from "@/assets/spin-ticket.png";
import Image from "next/image";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-client";
import { fetchSpinTickets } from "@/lib/server/cosmo/spin";

export const metadata: Metadata = {
  title: "Objekt Spin",
};

export default async function SpinPage() {
  const selectedArtist = await getSelectedArtist();
  const user = await decodeUser();
  if (!user) redirect("/");

  // prefetch available tickets
  const queryClient = getQueryClient();
  queryClient.prefetchQuery({
    queryKey: ["spin-tickets", selectedArtist],
    queryFn: () => fetchSpinTickets(user.accessToken, selectedArtist),
  });

  const [artists, currentUser, seasons] = await Promise.all([
    getArtistsWithMembers(),
    getUserByIdentifier(user.address),
    getSeasons(user.accessToken, selectedArtist),
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
          <HydrationBoundary state={dehydrate(queryClient)}>
            <main className="container flex flex-col py-2">
              {/* header */}
              <div className="flex gap-2 items-center w-full pb-1 justify-between">
                <div className="flex flex-col">
                  <h1 className="text-3xl font-cosmo uppercase drop-shadow-lg">
                    Spin
                  </h1>
                  <span className="h-5 flex items-center gap-2 text-xs">
                    <Image
                      src={SpinTicket.src}
                      alt="Spin Ticket"
                      width={20}
                      height={20}
                    />
                    <div id="spin-countdown" />
                  </span>
                </div>

                <AvailableTickets />
              </div>

              {/* content */}
              <SpinContainer
                seasons={seasons}
                currentUser={currentUser.profile}
              />
            </main>
          </HydrationBoundary>
        </ProfileProvider>
      </CosmoArtistProvider>
    </UserStateProvider>
  );
}
