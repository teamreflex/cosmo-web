import AuthOptions from "./auth/auth-options";
import ApolloLogo from "./apollo-logo";
import { Suspense } from "react";
import Links from "./links";
import GasDisplay from "../misc/gas-display";
import ComoBalances from "./como-balances";
import { decodeUser, getProfile } from "@/app/data-fetching";
import { fetchArtists } from "@/lib/server/cosmo/artists";
import UpdateDialog from "./updates/update-dialog";

export default async function Navbar() {
  return (
    <nav className="sticky left-0 right-0 top-0 h-14 z-30">
      <div className="glass">
        <div className="flex w-full items-center h-14">
          <div className="container md:grid md:grid-cols-3 flex items-center gap-2 text-sm text-foreground md:gap-4 md:py-6 pointer-events-auto">
            <div className="flex gap-4 items-center">
              <ApolloLogo color="white" />
              <Suspense
                fallback={
                  <div className="w-12 h-6 rounded-lg bg-accent animate-pulse" />
                }
              >
                <GasDisplay />
              </Suspense>

              <UpdateDialog />
            </div>

            <LinksRenderer />

            <div className="flex grow-0 items-center justify-end gap-2">
              <Suspense
                fallback={
                  <div className="h-10 w-10 rounded-full bg-accent animate-pulse" />
                }
              >
                <Auth />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
      <div className="glass-edge"></div>
    </nav>
  );
}

async function LinksRenderer() {
  const user = await decodeUser();

  return <Links user={user} />;
}

async function Auth() {
  const user = await decodeUser();

  const [artists, profile] = await Promise.all([
    fetchArtists(),
    user ? getProfile(user.profileId) : Promise.resolve(undefined),
  ]);

  return (
    <AuthOptions
      user={user}
      profile={profile}
      artists={artists}
      selectedArtist={profile?.artist}
      comoBalances={user ? <ComoRenderer address={user.address} /> : null}
    />
  );
}

function ComoRenderer({ address }: { address: string }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2">
          <div className="h-[26px] w-16 rounded bg-accent animate-pulse" />
          <div className="h-[26px] w-16 rounded bg-accent animate-pulse" />
        </div>
      }
    >
      <ComoBalances address={address} />
    </Suspense>
  );
}
