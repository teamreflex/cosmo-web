import AuthOptions from "./auth/auth-options";
import ApolloLogo from "./apollo-logo";
import { Suspense } from "react";
import Links from "./links";
import {
  decodeUser,
  getArtistsWithMembers,
  getProfile,
} from "@/app/data-fetching";
import UpdateDialog from "./updates/update-dialog";
import PolygonGasRenderer from "../misc/gas-display";
import ComoBalanceRenderer from "./como-balances";
import { TokenPayload } from "@/lib/universal/auth";

export default async function Navbar() {
  const user = await decodeUser();

  return (
    <nav className="sticky left-0 right-0 top-0 h-14 z-30">
      <div className="glass">
        <div className="flex w-full items-center h-14">
          <div className="container lg:grid lg:grid-cols-3 flex items-center gap-2 text-sm text-foreground lg:gap-4 lg:py-6 pointer-events-auto">
            <div className="flex gap-4 items-center">
              <ApolloLogo color="white" />
              <PolygonGasRenderer />

              <UpdateDialog />
            </div>

            <Links user={user} />

            <div className="flex grow-0 items-center justify-end gap-2">
              <Suspense
                fallback={
                  <div className="h-10 w-10 rounded-full bg-accent animate-pulse" />
                }
              >
                <Auth user={user} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
      <div className="glass-edge"></div>
    </nav>
  );
}

async function Auth({ user }: { user?: TokenPayload }) {
  const [artists, profile] = await Promise.all([
    getArtistsWithMembers(),
    user ? getProfile(user.profileId) : undefined,
  ]);

  return (
    <AuthOptions
      user={user}
      profile={profile}
      artists={artists}
      selectedArtist={profile?.artist}
      comoBalances={
        user ? <ComoBalanceRenderer address={user.address} /> : null
      }
    />
  );
}
