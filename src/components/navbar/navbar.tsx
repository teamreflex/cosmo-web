import Logo from "../logo";
import { Suspense } from "react";
import UpdateDialog from "../misc/update-dialog";
import SystemStatus from "../misc/system-status";
import Links, { LinksSkeleton } from "./links.server";
import {
  getArtistsWithMembers,
  getSelectedArtists,
  getSession,
} from "@/app/data-fetching";
import StateGuest from "../auth/state-guest";
import StateAuthenticated from "../auth/state-authenticated";
import { ErrorBoundary } from "react-error-boundary";
import AuthFallback from "../auth/auth-fallback";
import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import { toPublicUser } from "@/lib/server/auth";
import { SelectedArtistsProvider } from "@/hooks/use-selected-artists";
import Skeleton from "../skeleton/skeleton";

export default async function Navbar() {
  return (
    <nav className="sticky left-0 right-0 top-0 h-14 z-30">
      <div className="glass">
        <div className="flex w-full items-center h-14">
          <div className="container lg:grid lg:grid-cols-3 flex items-center gap-2 text-sm text-foreground lg:gap-4 lg:py-6 pointer-events-auto">
            <div className="flex gap-4 items-center">
              <Logo className="h-10" />
              <div className="relative flex items-center">
                <SystemStatus />
                <UpdateDialog />
              </div>
            </div>

            <Suspense fallback={<LinksSkeleton />}>
              <Links />
            </Suspense>

            <div className="flex grow-0 items-center justify-end gap-2">
              <ErrorBoundary fallback={<AuthFallback />}>
                <Suspense
                  fallback={
                    <Skeleton className="size-8 rounded-full shrink-0 aspect-square" />
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
  const [session, artists, selectedArtists] = await Promise.all([
    getSession(),
    getArtistsWithMembers(),
    getSelectedArtists(),
  ]);

  return (
    <CosmoArtistProvider artists={artists}>
      <SelectedArtistsProvider selected={selectedArtists}>
        {session === null ? (
          <StateGuest />
        ) : (
          <StateAuthenticated user={toPublicUser(session.user)} />
        )}
      </SelectedArtistsProvider>
    </CosmoArtistProvider>
  );
}
