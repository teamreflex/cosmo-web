"use client";

import {
  QueryErrorResetBoundary,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import TransferRow from "./transfer-row";
import { InfiniteQueryNext } from "../infinite-query-pending";
import Portal from "../portal";
import { ErrorBoundary } from "react-error-boundary";
import { HeartCrack, RefreshCcw } from "lucide-react";
import { Button } from "../ui/button";
import { Suspense } from "react";
import Skeleton from "../skeleton/skeleton";
import { PublicProfile } from "@/lib/universal/cosmo/auth";
import { transfersQuery } from "./queries";

type Props = {
  profile: PublicProfile;
};

export default function TransfersRenderer({ profile }: Props) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ resetErrorBoundary }) => (
            <div className="flex flex-col gap-2 items-center w-full">
              <div className="flex flex-col gap-2 justify-center items-center py-12">
                <HeartCrack className="h-12 w-12" />
                <p>There was an error loading transfers</p>
              </div>
              <Button variant="outline" onClick={resetErrorBoundary}>
                <RefreshCcw className="mr-2" /> Retry
              </Button>
            </div>
          )}
        >
          <Suspense fallback={<TransfersSkeleton />}>
            <Transfers address={profile.address} />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function Transfers({ address }: { address: string }) {
  const query = useSuspenseInfiniteQuery(transfersQuery(address));

  const rows = query.data.pages.flatMap((p) => p.results);

  return (
    <div className="flex flex-col rounded-lg border border-accent text-sm">
      <div className="items-center grid grid-cols-[3fr_2fr_2fr_2fr] gap-2 h-12 px-4 text-left align-middle font-medium text-muted-foreground">
        <span>Objekt</span>
        <span>Action</span>
        <span>User</span>
        <span className="text-right">Date</span>
      </div>

      <div className="flex flex-col">
        {rows.map((row) => (
          <TransferRow key={row.transfer.id} row={row} address={address} />
        ))}
      </div>

      <Portal to="#pagination">
        <InfiniteQueryNext
          status={query.status}
          hasNextPage={query.hasNextPage}
          isFetchingNextPage={query.isFetchingNextPage}
          fetchNextPage={query.fetchNextPage}
        />
      </Portal>
    </div>
  );
}

export function TransfersSkeleton() {
  return (
    <div className="w-full flex flex-col rounded-lg border border-accent text-sm">
      <div className="items-center grid grid-cols-[3fr_2fr_2fr_2fr] gap-2 h-12 px-4 text-left align-middle font-medium text-muted-foreground">
        <span>Objekt</span>
        <span>Action</span>
        <span>User</span>
        <span className="text-right">Date</span>
      </div>

      <Skeleton className="w-full rounded-t-none h-16 sm:h-12 border-t border-accent" />
    </div>
  );
}
