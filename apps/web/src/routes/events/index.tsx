import { Error } from "@/components/error-boundary";
import ActiveEventsCarousel from "@/components/events/active-events-carousel";
import EventsBackground from "@/components/events/events-background";
import EventsList from "@/components/events/events-list";
import SkeletonGradient from "@/components/skeleton/skeleton-overlay";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { selectedArtistsQuery } from "@/lib/queries/core";
import { activeEventsQuery, paginatedEventsQuery } from "@/lib/queries/events";
import type { EventWithEra } from "@apollo/database/web/types";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useCallback, useState } from "react";

export const Route = createFileRoute("/events/")({
  loader: async ({ context }) => {
    const selected =
      await context.queryClient.ensureQueryData(selectedArtistsQuery);
    const selectedIds = selected.length > 0 ? selected : undefined;

    const [activeEvents] = await Promise.all([
      context.queryClient.ensureQueryData(activeEventsQuery(selectedIds)),
      context.queryClient.ensureInfiniteQueryData(
        paginatedEventsQuery(selectedIds),
      ),
    ]);

    return { activeEvents };
  },
  staleTime: 1000 * 60 * 15, // 15 minutes
  component: RouteComponent,
  pendingComponent: PendingComponent,
  errorComponent: ErrorComponent,
  head: () => defineHead({ title: m.events_header(), canonical: "/events" }),
});

function RouteComponent() {
  const { activeEvents } = Route.useLoaderData();
  const { data: selected } = useSuspenseQuery(selectedArtistsQuery);

  const [hoveredEvent, setHoveredEvent] = useState<EventWithEra | null>(null);
  const [bgEvent, setBgEvent] = useState<EventWithEra | null>(
    () => activeEvents[0] ?? null,
  );

  const handleActiveChange = useCallback((event: EventWithEra | null) => {
    setBgEvent(event);
    setHoveredEvent(null);
  }, []);

  const handleHoverChange = useCallback((event: EventWithEra | null) => {
    setHoveredEvent(event);
  }, []);

  const selectedIds = selected.length > 0 ? selected : undefined;

  return (
    <main className="container flex flex-col py-2">
      {/* dynamic background - extends under navbar */}
      <EventsBackground event={hoveredEvent ?? bgEvent} />

      {/* header */}
      <div className="relative z-10">
        <h1 className="font-cosmo text-3xl text-white uppercase drop-shadow-lg">
          {m.events_header()}
        </h1>
      </div>

      {/* active events carousel */}
      <ActiveEventsCarousel
        events={activeEvents}
        onActiveChange={handleActiveChange}
        onHoverChange={handleHoverChange}
      />

      {/* all events list */}
      <Suspense fallback={<ListSkeleton />}>
        <EventsList
          selectedArtists={selectedIds}
          onHoverChange={setHoveredEvent}
        />
      </Suspense>
    </main>
  );
}

function ListSkeleton() {
  return (
    <div className="relative z-10 mt-4 flex flex-col divide-y divide-accent overflow-hidden rounded-lg border border-accent">
      <SkeletonGradient />
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-none" />
      ))}
    </div>
  );
}

function PendingComponent() {
  return (
    <main className="container flex flex-col py-2">
      <h1 className="font-cosmo text-3xl uppercase">{m.events_header()}</h1>

      <div className="relative mt-4 flex flex-col divide-y divide-accent overflow-hidden rounded-lg border border-accent">
        <SkeletonGradient />
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-none" />
        ))}
      </div>
    </main>
  );
}

function ErrorComponent() {
  return <Error message={m.events_error_loading()} />;
}
