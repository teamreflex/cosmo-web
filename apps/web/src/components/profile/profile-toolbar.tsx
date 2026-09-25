import ComoTotals from "@/components/como/como-totals";
import GridToolbar from "@/components/grid/grid-toolbar";
import CosmoMemberFilter from "@/components/objekt/cosmo-member-filter";
import ProgressToolbar from "@/components/progress/progress-toolbar";
import TransfersMemberFilter from "@/components/transfers/transfers-member-filter";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { useMatches } from "@tanstack/react-router";
import { Suspense } from "react";
import type { PropsWithChildren } from "react";
import { ErrorBoundary } from "react-error-boundary";

type Props = {
  address: string;
};

/**
 * The active page's title and controls, rendered by the profile layout so
 * they stream with the header instead of popping in through a portal.
 */
export default function ProfileToolbar({ address }: Props) {
  const routeId = useMatches({ select: (matches) => matches.at(-1)?.routeId });

  switch (routeId) {
    case "/@{$username}/":
      return (
        <Toolbar title={m.collection_title()}>
          <CosmoMemberFilter align="end" />
        </Toolbar>
      );
    case "/@{$username}/trades":
      return (
        <Toolbar title={m.trades_title()}>
          <TransfersMemberFilter />
        </Toolbar>
      );
    case "/@{$username}/como":
      return (
        <Toolbar title={m.common_como()}>
          <ErrorBoundary fallback={null}>
            <Suspense fallback={<Skeleton className="h-5 w-40" />}>
              <ComoTotals address={address} />
            </Suspense>
          </ErrorBoundary>
        </Toolbar>
      );
    case "/@{$username}/progress":
      return (
        <Toolbar title={m.progress_title()}>
          <ProgressToolbar />
        </Toolbar>
      );
    case "/@{$username}/grid":
      return (
        <Toolbar title={m.grid_title()}>
          <GridToolbar />
        </Toolbar>
      );
    // the list header below the tabs carries this page's heading
    case "/@{$username}/list/$slug":
      return (
        <Toolbar title={m.list_title()} heading={false}>
          <CosmoMemberFilter align="end" />
        </Toolbar>
      );
    default:
      return null;
  }
}

type ToolbarProps = PropsWithChildren<{
  title: string;
  heading?: boolean;
}>;

/**
 * Tab labels name the page from md up, so the title only shows beside the
 * mobile icon tabs.
 */
function Toolbar({ title, heading = true, children }: ToolbarProps) {
  const Title = heading ? "h1" : "p";

  return (
    <>
      <Title
        className={cn(
          "mr-auto font-cosmo text-xl leading-none font-black tracking-wide uppercase",
          heading ? "md:sr-only" : "md:hidden",
        )}
      >
        {title}
      </Title>
      <div className="flex items-center gap-2 md:pointer-events-auto">
        {children}
      </div>
    </>
  );
}
