import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  EventsFilters,
  SetEventsFilters,
} from "@/hooks/use-events-filters";
import { m } from "@/i18n/messages";
import { IconRotate } from "@tabler/icons-react";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import EventsArtistFilter from "./filter-artist";
import EventsEraFilter from "./filter-era";
import EventsSeasonFilter from "./filter-season";
import EventsSortFilter from "./filter-sort";
import EventsTypeFilter from "./filter-type";

type Props = {
  filters: EventsFilters;
  setFilters: SetEventsFilters;
};

function filtersAreDirty(filters: EventsFilters) {
  return Boolean(
    filters.sort ||
    filters.artist ||
    filters.era ||
    filters.season?.length ||
    filters.type,
  );
}

export default function EventsFiltersContainer({ filters, setFilters }: Props) {
  const isDirty = filtersAreDirty(filters);

  function handleReset() {
    setFilters({
      sort: undefined,
      artist: undefined,
      era: undefined,
      season: undefined,
      type: undefined,
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 md:justify-end">
      <EventsSortFilter sort={filters.sort} onChange={setFilters} />
      <EventsArtistFilter artist={filters.artist} onChange={setFilters} />
      <ErrorBoundary
        fallback={<Skeleton className="h-9 w-24 bg-destructive" />}
      >
        <Suspense fallback={<Skeleton className="h-9 w-24" />}>
          <EventsEraFilter
            era={filters.era}
            artist={filters.artist}
            onChange={setFilters}
          />
        </Suspense>
      </ErrorBoundary>
      <ErrorBoundary
        fallback={<Skeleton className="h-9 w-24 bg-destructive" />}
      >
        <Suspense fallback={<Skeleton className="h-9 w-24" />}>
          <EventsSeasonFilter
            seasons={filters.season}
            artist={filters.artist}
            onChange={setFilters}
          />
        </Suspense>
      </ErrorBoundary>
      <EventsTypeFilter type={filters.type} onChange={setFilters} />

      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={handleReset} disabled={!isDirty} variant="outline">
              <IconRotate />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{m.filter_reset()}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
