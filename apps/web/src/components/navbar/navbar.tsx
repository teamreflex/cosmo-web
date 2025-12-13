import { Fragment, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { IconArchive, IconCards, IconChartBar, IconMenu2, IconSearch } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import Logo from "../logo";
import UpdateDialog from "../misc/update-dialog";
import SystemStatus from "../misc/system-status";
import StateGuest from "../auth/state-guest";
import StateAuthenticated from "../auth/state-authenticated";
import AuthFallback from "../auth/auth-fallback";
import { Skeleton } from "../ui/skeleton";
import Links from "./links";
import { currentAccountQuery } from "@/lib/queries/core";

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
          <IconChartBar className="hidden size-8 shrink-0 fill-transparent lg:block" />
          <IconArchive className="hidden size-8 shrink-0 fill-transparent lg:block" />
          <IconSearch className="hidden size-8 shrink-0 fill-transparent lg:block" />
        </div>

        <div className="flex grow-0 items-center justify-end gap-2">
          <Skeleton className="aspect-square size-8 shrink-0 rounded-full" />
        </div>
      </div>

      {/* mobile */}
      <div className="ml-auto flex flex-row items-center gap-2 lg:hidden">
        <IconSearch className="size-8 shrink-0 fill-transparent drop-shadow-lg" />
        <IconMenu2 className="size-8 shrink-0 drop-shadow-lg" />
        <Skeleton className="aspect-square size-8 shrink-0 rounded-full" />
      </div>
    </Fragment>
  );
}

function AuthState() {
  const { data } = useSuspenseQuery(currentAccountQuery);

  return (
    <>
      <Links signedIn={data !== null} cosmo={data?.cosmo} />
      <div className="flex grow-0 items-center justify-end gap-2">
        {!data ? (
          <StateGuest />
        ) : (
          <StateAuthenticated user={data.user} cosmo={data.cosmo} />
        )}
      </div>
    </>
  );
}
