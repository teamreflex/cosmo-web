import Logo from "../logo";
import { Suspense } from "react";
import {
  decodeUser,
  getArtistsWithMembers,
  getSelectedArtist,
  getUserByIdentifier,
} from "@/app/data-fetching";
import UpdateDialog from "../misc/update-dialog";
import ComoBalanceRenderer from "./como-balances";
import { ErrorBoundary } from "react-error-boundary";
import SystemStatus from "../misc/system-status";
import CosmoAvatar from "./auth/cosmo-avatar";
import AuthFallback from "./auth-fallback";
import Links from "./links.server";
import { StateAuthenticated } from "./auth/state-authenticated";
import { StateGuest } from "./auth/state-guest";

export default async function Navbar() {
  return (
    <nav className="sticky left-0 right-0 top-0 h-14 z-30">
      <div className="glass">
        <div className="flex w-full items-center h-14">
          <div className="container lg:grid lg:grid-cols-3 flex items-center gap-2 text-sm text-foreground lg:gap-4 lg:py-6 pointer-events-auto">
            <div className="flex gap-4 items-center">
              <Logo className="h-10" />
              <div className="relative flex divide-x divide-border items-center">
                <SystemStatus />
                <UpdateDialog />
              </div>
            </div>

            <Suspense>
              <Links />
            </Suspense>

            <div className="flex grow-0 items-center justify-end gap-2">
              <ErrorBoundary
                fallback={<AuthFallback message="Error loading user" />}
              >
                <Suspense
                  fallback={
                    <div className="h-10 w-10 rounded-full bg-accent animate-pulse" />
                  }
                >
                  <Auth />
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>
      <div className="glass-edge"></div>
    </nav>
  );
}

async function Auth() {
  const user = await decodeUser();
  const [selectedArtist, artists, data] = await Promise.all([
    getSelectedArtist(),
    getArtistsWithMembers(),
    user ? getUserByIdentifier(user.nickname) : undefined,
  ]);

  // profile is missing
  if (user !== undefined && data === undefined) {
    throw new Error("Profile is missing, this should not be possible");
  }

  const isAuthenticated = user !== undefined && data !== undefined;
  if (isAuthenticated) {
    return (
      <StateAuthenticated
        profile={data.profile}
        artists={artists}
        selectedArtist={selectedArtist}
        comoBalances={
          user ? <ComoBalanceRenderer address={user.address} /> : null
        }
        cosmoAvatar={
          <ErrorBoundary
            fallback={<AuthFallback message="Error loading profile image" />}
          >
            <CosmoAvatar
              token={user}
              artist={selectedArtist}
              nickname={data.profile.nickname}
            />
          </ErrorBoundary>
        }
      />
    );
  }

  return <StateGuest />;
}
