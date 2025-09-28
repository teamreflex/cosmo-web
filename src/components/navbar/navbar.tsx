import { Fragment, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { IconCards } from "@tabler/icons-react";
import { ChartColumnBig, Menu, Search, Vote } from "lucide-react";
import { useSuspenseQueries } from "@tanstack/react-query";
import Logo from "../logo";
import UpdateDialog from "../misc/update-dialog";
import SystemStatus from "../misc/system-status";
import StateGuest from "../auth/state-guest";
import StateAuthenticated from "../auth/state-authenticated";
import AuthFallback from "../auth/auth-fallback";
import { Skeleton } from "../ui/skeleton";
import Links from "./links";
import { ArtistProvider } from "@/hooks/use-artists";
import {
  artistsQuery,
  currentAccountQuery,
  selectedArtistsQuery,
} from "@/lib/queries/core";

export default function Navbar() {
  return (
    <nav className="sticky top-0 right-0 left-0 z-30 h-14">
      <div className="glass">
        <div className="flex h-14 w-full items-center">
          <div className="pointer-events-auto container flex items-center gap-2 text-sm text-foreground lg:grid lg:grid-cols-3 lg:gap-4 lg:py-6">
            <div className="flex items-center gap-4">
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
    <Fragment>
      {/* desktop */}
      <div className="hidden lg:contents">
        <div className="flex items-center justify-center gap-6">
          <IconCards className="hidden size-8 shrink-0 fill-transparent lg:block" />
          <ChartColumnBig className="hidden size-8 shrink-0 fill-transparent lg:block" />
          <Vote className="hidden size-8 shrink-0 fill-transparent lg:block" />
          <Search className="hidden size-8 shrink-0 fill-transparent lg:block" />
        </div>

        <div className="flex grow-0 items-center justify-end gap-2">
          <Skeleton className="aspect-square size-8 shrink-0 rounded-full" />
        </div>
      </div>

      {/* mobile */}
      <div className="ml-auto flex flex-row items-center gap-2 lg:hidden">
        <Search className="size-8 shrink-0 fill-transparent drop-shadow-lg" />
        <Menu className="size-8 shrink-0 drop-shadow-lg" />
        <Skeleton className="aspect-square size-8 shrink-0 rounded-full" />
      </div>
    </Fragment>
  );
}

function AuthState() {
  const [{ data: account }, { data: artists }, { data: selected }] =
    useSuspenseQueries({
      queries: [currentAccountQuery, artistsQuery, selectedArtistsQuery],
    });

  return (
    <ArtistProvider artists={artists} selected={selected}>
      <Links signedIn={account !== null} cosmo={account?.cosmo} />
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
