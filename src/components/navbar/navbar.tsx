import { Fragment, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { IconCards } from "@tabler/icons-react";
import { ChartColumnBig, Menu, Search, Vote } from "lucide-react";
import { useSuspenseQueries } from "@tanstack/react-query";
import Logo from "../logo";
import UpdateDialog from "../misc/update-dialog";
import SystemStatus from "../misc/system-status";
// import StateGuest from "../auth/state-guest";
// import StateAuthenticated from "../auth/state-authenticated";
import AuthFallback from "../auth/auth-fallback";
import { Skeleton } from "../ui/skeleton";
import Links from "./links";
import { ArtistProvider } from "@/hooks/use-artists";
import {
  artistsQuery,
  currentAccountQuery,
  selectedArtistsQuery,
} from "@/queries";

export default function Navbar() {
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
    <Fragment>
      {/* desktop */}
      <div className="hidden lg:contents">
        <div className="flex justify-center items-center gap-6">
          <IconCards className="hidden lg:block size-8 shrink-0 fill-transparent" />
          <ChartColumnBig className="hidden lg:block size-8 shrink-0 fill-transparent" />
          <Vote className="hidden lg:block size-8 shrink-0 fill-transparent" />
          <Search className="hidden lg:block size-8 shrink-0 fill-transparent" />
        </div>

        <div className="flex grow-0 items-center justify-end gap-2">
          <Skeleton className="size-8 rounded-full shrink-0 aspect-square" />
        </div>
      </div>

      {/* mobile */}
      <div className="flex flex-row gap-2 lg:hidden items-center ml-auto">
        <Search className="size-8 shrink-0 drop-shadow-lg fill-transparent" />
        <Menu className=" size-8 shrink-0 drop-shadow-lg" />
        <Skeleton className="size-8 rounded-full shrink-0 aspect-square" />
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
      <Links signedIn={account !== undefined} cosmo={account?.cosmo} />
      {/* <div className="flex grow-0 items-center justify-end gap-2">
        {!account ? (
          <StateGuest />
        ) : (
          <StateAuthenticated user={account.user} cosmo={account.cosmo} />
        )}
      </div> */}
    </ArtistProvider>
  );
}
