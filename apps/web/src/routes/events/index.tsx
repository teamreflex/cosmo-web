import { Error } from "@/components/error-boundary";
import ActiveEventsCarousel from "@/components/events/active-events-carousel";
import EventsBackground from "@/components/events/events-background";
import EventsFiltersContainer from "@/components/events/events-filters";
import EventsList from "@/components/events/events-list";
import Overlay from "@/components/misc/overlay";
import ScrollToTop from "@/components/misc/overlay/scroll-to-top";
import SkeletonGradient from "@/components/skeleton/skeleton-overlay";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useEventsFilters,
  type EventsFilters,
} from "@/hooks/use-events-filters";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import {
  artistsQuery,
  filterDataQuery,
  selectedArtistsQuery,
} from "@/lib/queries/core";
import {
  activeEventsQuery,
  erasForFilterQuery,
  paginatedEventsQuery,
} from "@/lib/queries/events";
import { castToArray } from "@/lib/universal/parsers";
import { validArtists } from "@apollo/cosmo/types/common";
import { eventTypeKeys, type EventWithEra } from "@apollo/database/web/types";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useCallback, useState } from "react";
import * as z from "zod";

const eventsSearchSchema = z.object({
  sort: z.enum(["newest", "oldest"]).optional().catch(undefined),
  artist: z.enum(validArtists).optional().catch(undefined),
  season: castToArray(z.string()).optional().catch(undefined),
  era: z.string().optional().catch(undefined),
  type: z.enum(eventTypeKeys).optional().catch(undefined),
});

export const Route = createFileRoute("/events/")({
  validateSearch: eventsSearchSchema,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ context, deps: { search } }) => {
    void context.queryClient.prefetchQuery(filterDataQuery);
    void context.queryClient.prefetchQuery(erasForFilterQuery);
    void context.queryClient.prefetchQuery(artistsQuery);

    const selected =
      await context.queryClient.ensureQueryData(selectedArtistsQuery);

    const globalSelectedIds = selected.length > 0 ? selected : undefined;
    const filteredArtists = search.artist ? [search.artist] : globalSelectedIds;

    const [activeEvents] = await Promise.all([
      // active events only uses global selection, not filters
      context.queryClient.ensureQueryData(activeEventsQuery(globalSelectedIds)),
      context.queryClient.ensureInfiniteQueryData(
        paginatedEventsQuery({ artists: filteredArtists, filters: search }),
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
  const { filters, setFilters } = useEventsFilters();

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

  const globalSelectedIds = selected.length > 0 ? selected : undefined;
  const filteredArtists = filters.artist ? [filters.artist] : globalSelectedIds;

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

      {/* all events list with filters */}
      <EventsListWithFilters
        selectedArtists={filteredArtists}
        filters={filters}
        setFilters={setFilters}
        onHoverChange={setHoveredEvent}
      />

      <Overlay>
        <ScrollToTop />
      </Overlay>
    </main>
  );
}

type EventsListWithFiltersProps = {
  selectedArtists: string[] | undefined;
  filters: EventsFilters;
  setFilters: (
    input:
      | Partial<EventsFilters>
      | ((prev: EventsFilters) => Partial<EventsFilters>),
  ) => void;
  onHoverChange: (event: EventWithEra | null) => void;
};

function EventsListWithFilters({
  selectedArtists,
  filters,
  setFilters,
  onHoverChange,
}: EventsListWithFiltersProps) {
  return (
    <div className="relative z-20 mt-4 flex flex-col overflow-hidden rounded-lg border border-accent bg-background/60 text-sm backdrop-blur-md">
      {/* filters row - stays visible during loading */}
      <div className="border-b border-accent p-3 md:px-4">
        <EventsFiltersContainer filters={filters} setFilters={setFilters} />
      </div>

      {/* events list - suspends on filter change */}
      <Suspense fallback={<ListContentSkeleton />}>
        <EventsList
          selectedArtists={selectedArtists}
          filters={filters}
          onHoverChange={onHoverChange}
        />
      </Suspense>
    </div>
  );
}

function ListContentSkeleton() {
  return (
    <div className="relative flex flex-col divide-y divide-accent">
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
