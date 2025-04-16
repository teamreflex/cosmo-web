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
import StateAuthenticated from "./auth/state-authenticated";
import StateGuest from "./auth/state-guest";
import StateMissingProfile from "./auth/state-missing-profile";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { AlertTriangle } from "lucide-react";

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

                <Popover>
                  <PopoverTrigger asChild>
                    <button className="relative h-8 w-9 flex justify-center items-center rounded-lg bg-red-500/40 hover:bg-red-500/60 transition-colors cursor-pointer mx-2">
                      <AlertTriangle className="text-red-500 w-5 h-5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="text-xs flex flex-col gap-2">
                    <p className="font-bold">
                      MODHAUS has currently suspended on-chain activities until
                      April 18th 3PM KST.
                    </p>
                    <p>
                      The following features have been disabled until the
                      maintenance period has ended:
                    </p>
                    <ul className="list-disc list-inside">
                      <li>Objekt sending</li>
                      <li>Objekt scanning</li>
                      <li>Objekt spin</li>
                      <li>Grids</li>
                    </ul>
                    <p>
                      If changes have been made that break Apollo, you may
                      experience errors and features will be disabled for longer
                      until they can be fixed.
                    </p>
                  </PopoverContent>
                </Popover>
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
                    <div className="size-10 rounded-full bg-accent animate-pulse" />
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
    user ? getUserByIdentifier(user.nickname).catch(() => null) : undefined,
  ]);

  // profile is missing
  if (data === null) {
    return <StateMissingProfile />;
  }

  const isAuthenticated = user !== undefined && data !== undefined;
  return (
    <div className="contents">
      {/* signed in and profile exists */}
      {isAuthenticated && (
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
                nickname={user.nickname}
              />
            </ErrorBoundary>
          }
        />
      )}

      {/* not signed in, allows dialog to persist after sign-in */}
      <StateGuest hide={isAuthenticated} />
    </div>
  );
}
