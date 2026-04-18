import { currentAccountQuery } from "@/lib/queries/core";
import {
  IconArchive,
  IconCards,
  IconChartBar,
  IconMenu2,
  IconSearch,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Fragment, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import AuthFallback from "../auth/auth-fallback";
import StateAuthenticated from "../auth/state-authenticated";
import StateGuest from "../auth/state-guest";
import Logo from "../logo";
import SystemStatus from "../misc/system-status";
import UpdateDialog from "../misc/update-dialog";
import { Skeleton } from "../ui/skeleton";
import Links from "./links";

export default function Navbar() {
  return (
    <nav className="sticky top-0 right-0 left-0 z-30 h-14 border-b border-border bg-background/90 backdrop-blur-lg">
      <div className="container flex h-14 items-center gap-4 text-sm text-foreground">
        <Logo className="h-8" />
        <div className="flex items-center">
          <SystemStatus />
          <UpdateDialog />
        </div>

        <ErrorBoundary fallback={<AuthFallback />}>
          <Suspense fallback={<NavbarFallback />}>
            <AuthState />
          </Suspense>
        </ErrorBoundary>
      </div>
    </nav>
  );
}

function NavbarFallback() {
  return (
    <Fragment>
      {/* desktop */}
      <div className="ml-auto hidden items-center gap-4 lg:flex">
        <IconCards className="size-6 shrink-0 fill-transparent" />
        <IconChartBar className="size-6 shrink-0 fill-transparent" />
        <IconArchive className="size-6 shrink-0 fill-transparent" />
        <Skeleton className="aspect-square size-8 shrink-0 rounded-sm" />
        <Skeleton className="aspect-square size-8 shrink-0 rounded-full" />
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
      <div className="ml-auto flex grow-0 items-center justify-end gap-2">
        {!data ? (
          <StateGuest />
        ) : (
          <StateAuthenticated user={data.user} cosmo={data.cosmo} />
        )}
      </div>
    </>
  );
}
