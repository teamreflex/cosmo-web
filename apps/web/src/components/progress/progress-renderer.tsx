import { useArtists } from "@/hooks/use-artists";
import { useProgressFilters } from "@/hooks/use-progress-filters";
import { m } from "@/i18n/messages";
import { IconRefresh } from "@tabler/icons-react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import type { PropsWithChildren } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Button } from "../ui/button";
import ProgressMember, { ProgressMemberSkeleton } from "./progress-member";

type Props = PropsWithChildren<{
  address: string;
}>;

/**
 * Swaps the overview (children) for a member's progress when one is selected.
 */
export default function ProgressRenderer(props: Props) {
  const { filters } = useProgressFilters();
  const { getArtistForMember } = useArtists();

  const memberArtist = filters.member
    ? getArtistForMember(filters.member)
    : undefined;

  return (
    <div className="container flex flex-col gap-6 pt-4">
      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary
            onReset={reset}
            fallbackRender={({ resetErrorBoundary }) => (
              <div className="flex flex-col items-center gap-2 py-6 text-sm font-semibold">
                <p className="text-center text-sm font-semibold">
                  {m.progress_error_fetching()}
                </p>

                <Button variant="outline" onClick={resetErrorBoundary}>
                  <IconRefresh className="mr-2" /> {m.error_try_again()}
                </Button>
              </div>
            )}
          >
            {filters.member && memberArtist ? (
              <Suspense fallback={<ProgressMemberSkeleton />}>
                <ProgressMember
                  artist={memberArtist}
                  address={props.address}
                  member={filters.member}
                />
              </Suspense>
            ) : (
              props.children
            )}
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </div>
  );
}
