import AuthOptions from "./auth/auth-options";
import Logo from "../logo";
import { Suspense } from "react";
import {
  decodeUser,
  getArtistsWithMembers,
  getProfile,
  getSelectedArtist,
} from "@/app/data-fetching";
import UpdateDialog from "../misc/update-dialog";
import ComoBalanceRenderer from "./como-balances";
import { ErrorBoundary } from "react-error-boundary";
import SystemStatus from "../misc/system-status";
import CosmoAvatar from "./auth/cosmo-avatar";
import AuthFallback from "./auth-fallback";
import Links from "./links.server";

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
              <ErrorBoundary fallback={<AuthFallback />}>
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
  const [selectedArtist, artists, profile] = await Promise.all([
    getSelectedArtist(),
    getArtistsWithMembers(),
    user ? getProfile(user.profileId) : undefined,
  ]);

  return (
    <AuthOptions
      token={user}
      profile={profile}
      artists={artists}
      selectedArtist={selectedArtist}
      comoBalances={
        user ? <ComoBalanceRenderer address={user.address} /> : null
      }
      cosmoAvatar={
        <ErrorBoundary fallback={<AuthFallback />}>
          <CosmoAvatar
            token={user}
            artist={selectedArtist}
            nickname={profile?.nickname}
          />
        </ErrorBoundary>
      }
    />
  );
}
