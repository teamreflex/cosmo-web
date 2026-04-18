import { Skeleton } from "@/components/ui/skeleton";
import type {
  EventsFilters,
  SetEventsFilters,
} from "@/hooks/use-events-filters";
import { m } from "@/i18n/messages";
import { IconX } from "@tabler/icons-react";
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

function countActive(filters: EventsFilters) {
  let n = 0;
  if (filters.sort) n += 1;
  if (filters.artist) n += 1;
  if (filters.era) n += 1;
  if (filters.season?.length) n += filters.season.length;
  if (filters.type) n += 1;
  return n;
}

export default function EventsFiltersContainer({ filters, setFilters }: Props) {
  const count = countActive(filters);

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
    <div className="flex flex-wrap items-center gap-2">
      <EventsArtistFilter artist={filters.artist} onChange={setFilters} />
      <ErrorBoundary
        fallback={<Skeleton className="h-8 w-24 bg-destructive" />}
      >
        <Suspense fallback={<Skeleton className="h-8 w-24" />}>
          <EventsEraFilter
            era={filters.era}
            artist={filters.artist}
            onChange={setFilters}
          />
        </Suspense>
      </ErrorBoundary>
      <ErrorBoundary
        fallback={<Skeleton className="h-8 w-24 bg-destructive" />}
      >
        <Suspense fallback={<Skeleton className="h-8 w-24" />}>
          <EventsSeasonFilter
            seasons={filters.season}
            artist={filters.artist}
            onChange={setFilters}
          />
        </Suspense>
      </ErrorBoundary>
      <EventsTypeFilter type={filters.type} onChange={setFilters} />
      <EventsSortFilter sort={filters.sort} onChange={setFilters} />

      {count > 0 && (
        <button
          type="button"
          onClick={handleReset}
          aria-label={m.aria_reset_filters()}
          className="inline-flex h-8 items-center gap-1 rounded-sm px-2 text-[11px] tracking-[0.14em] text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          <IconX className="size-3" />
          <span>{m.filter_reset()}</span>
          <span className="font-mono text-xxs">({count})</span>
        </button>
      )}
    </div>
  );
}
