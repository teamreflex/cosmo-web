import { currentAccountQuery } from "@/lib/queries/core";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import AuthFallback from "../auth/auth-fallback";
import StateAuthenticated from "../auth/state-authenticated";
import StateGuest from "../auth/state-guest";
import Logo from "../logo";
import SystemStatus from "../misc/system-status";
import UpdateDialog from "../misc/update-dialog";
import NotificationBell from "../notifications/notification-bell";
import { Skeleton } from "../ui/skeleton";
import { DesktopAuthLinks, DesktopPublicLinks, MobileMenu } from "./links";
import NavbarSearch from "./navbar-search";

export default function Navbar() {
  return (
    <nav className="sticky top-0 right-0 left-0 z-30 h-14 border-b border-border bg-background/90 backdrop-blur-lg">
      <div className="container flex h-14 items-center gap-4 text-sm text-foreground">
        <Logo className="h-8" />
        <div className="flex items-center">
          <SystemStatus />
          <UpdateDialog />
        </div>

        <DesktopPublicLinks />

        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <DesktopAuthLink />
          </Suspense>
        </ErrorBoundary>

        <div className="ml-auto flex items-center gap-2">
          <NavbarSearch />

          <ErrorBoundary fallback={<AuthFallback />}>
            <Suspense fallback={<RightClusterFallback />}>
              <RightCluster />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </nav>
  );
}

function DesktopAuthLink() {
  const { data } = useSuspenseQuery(currentAccountQuery);
  return <DesktopAuthLinks cosmo={data?.cosmo} />;
}

function RightCluster() {
  const { data } = useSuspenseQuery(currentAccountQuery);
  const location = useLocation();

  return (
    <>
      {data && <NotificationBell key={location.pathname} />}
      <MobileMenu signedIn={data !== null} cosmo={data?.cosmo} />
      {!data ? (
        <StateGuest />
      ) : (
        <StateAuthenticated user={data.user} cosmo={data.cosmo} />
      )}
    </>
  );
}

function RightClusterFallback() {
  return (
    <>
      <Skeleton className="size-9 rounded-sm" />
      <Skeleton className="size-8 rounded-sm lg:hidden" />
      <Skeleton className="size-8 rounded-full" />
    </>
  );
}
