"use client";

import TicketCountdown from "./ticket-countdown";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";
import SpinTicket from "@/assets/spin-ticket.png";
import Image from "next/image";
import Portal from "../portal";
import { cn } from "@/lib/utils";
import Skeleton from "../skeleton/skeleton";
import SpinInProgress from "./spin-in-progress";
import { useSpinTickets } from "@/hooks/use-objekt-spin";

export default function AvailableTickets() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ resetErrorBoundary }) => (
            <button onClick={resetErrorBoundary}>retry</button>
          )}
        >
          <Suspense fallback={<Skeleton className="h-12 w-38 rounded-full" />}>
            <Tickets />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function Tickets() {
  const { data, refetch, isRefetching } = useSpinTickets();

  return (
    <div className="flex gap-2 items-center">
      <div className="flex gap-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <TicketIcon key={i} isActive={i + 1 <= data.availableTicketsCount} />
        ))}
      </div>

      <SpinInProgress inProgressSpinId={data.inProgressSpinId} />

      <Portal to="#spin-countdown">
        {data.nextReceiveAt !== null ? (
          <TicketCountdown
            nextReceiveAt={data.nextReceiveAt}
            triggerRefetch={refetch}
            isRefetching={isRefetching}
          />
        ) : (
          <span className="text-cosmo-text font-semibold">Max</span>
        )}
      </Portal>
    </div>
  );
}

function TicketIcon({ isActive = true }: { isActive?: boolean }) {
  return (
    <div className="flex items-center justify-center rounded-full aspect-square bg-accent size-12">
      <Image
        src={SpinTicket.src}
        alt="Spin Ticket"
        width={32}
        height={32}
        className={cn(
          "-rotate-20",
          !isActive && "grayscale saturate-0 brightness-50"
        )}
      />
    </div>
  );
}
