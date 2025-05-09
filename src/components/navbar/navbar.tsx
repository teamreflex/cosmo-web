import Logo from "../logo";
import { Suspense } from "react";
import UpdateDialog from "../misc/update-dialog";
import SystemStatus from "../misc/system-status";
import Links, { LinksSkeleton } from "./links.server";
import {
  getCurrentAccount,
  getArtistsWithMembers,
  getSelectedArtists,
  getSession,
} from "@/app/data-fetching";
import StateGuest from "../auth/state-guest";
import StateAuthenticated from "../auth/state-authenticated";
import { ErrorBoundary } from "react-error-boundary";
import AuthFallback from "../auth/auth-fallback";
import { ArtistProvider } from "@/hooks/use-artists";
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

            <ErrorBoundary fallback={<AuthFallback />}>
              <Suspense fallback={<NavbarFallback />}>
                <AuthState />
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      </div>
      <div className="glass-edge"></div>
    </nav>
  );
}

function NavbarFallback() {
  return (
    <div className="contents">
      <LinksSkeleton />
      <div className="flex grow-0 items-center justify-end gap-2">
        <Skeleton className="size-8 rounded-full shrink-0 aspect-square" />
      </div>
    </div>
  );
}

async function AuthState() {
  const session = await getSession();
  const [account, artists, selected] = await Promise.all([
    getCurrentAccount(session?.session.userId),
    getArtistsWithMembers(),
    getSelectedArtists(),
  ]);

  return (
    <ArtistProvider artists={artists} selected={selected}>
      <Links cosmo={account?.cosmo} />
      <div className="flex grow-0 items-center justify-end gap-2">
        {!account ? (
          <StateGuest />
        ) : (
          <StateAuthenticated user={account.user} cosmo={account.cosmo} />
        )}
      </div>
    </ArtistProvider>
  );
}
