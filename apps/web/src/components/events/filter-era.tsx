import { useArtists } from "@/hooks/use-artists";
import type {
  EventsFilters,
  SetEventsFilters,
} from "@/hooks/use-events-filters";
import { m } from "@/i18n/messages";
import { erasForFilterQuery } from "@/lib/queries/events";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import FilterChip from "../collection/filter-chip";

type Props = {
  era: EventsFilters["era"];
  artist: EventsFilters["artist"];
  onChange: SetEventsFilters;
};

export default function EventsEraFilter({ era, artist, onChange }: Props) {
  const { data: eras } = useSuspenseQuery(erasForFilterQuery);
  const { artistList, selectedIds } = useArtists();

  const groupedEras = useMemo(() => {
    const filtered = eras.filter((e) => {
      if (artist) return e.artist === artist;
      if (selectedIds.length > 0) return selectedIds.includes(e.artist);
      return true;
    });

    const groups = new Map<
      string,
      { artist: (typeof artistList)[0]; eras: typeof eras }
    >();

    for (const e of filtered) {
      const artistData = artistList.find((a) => a.id === e.artist);
      if (!artistData) continue;

      if (!groups.has(e.artist)) {
        groups.set(e.artist, { artist: artistData, eras: [] });
      }
      groups.get(e.artist)!.eras.push(e);
    }

    return Array.from(groups.values()).sort(
      (a, b) => a.artist.comoTokenId - b.artist.comoTokenId,
    );
  }, [eras, artist, selectedIds, artistList]);

  const selectedEra = era ? eras.find((e) => e.id === era) : undefined;
  const valueLabel = selectedEra?.name.toLowerCase() ?? m.filter_value_all();

  return (
    <FilterChip
      label={m.events_filter_era()}
      valueLabel={valueLabel}
      active={era !== undefined}
      width={280}
    >
      {({ close }) => (
        <div className="flex max-h-80 flex-col overflow-y-auto py-1">
          {groupedEras.map(({ artist: artistData, eras: artistEras }) => (
            <div key={artistData.id} className="flex flex-col">
              <div className="flex items-center gap-1.5 px-3 pt-2 pb-1 font-mono text-xxs tracking-[0.14em] text-muted-foreground uppercase">
                <img
                  className="size-4 shrink-0 rounded-full"
                  src={artistData.logoImageUrl}
                  alt={artistData.title}
                />
                <span>{artistData.title}</span>
              </div>
              {artistEras.map((e) => {
                const selected = era === e.id;
                const imageSrc = e.imageUrl ?? e.spotifyAlbumArt;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => {
                      onChange({ era: selected ? undefined : e.id });
                      close();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-accent"
                  >
                    {imageSrc && (
                      <img
                        src={imageSrc}
                        alt={e.name}
                        className="size-4 shrink-0 rounded-xs"
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate">{e.name}</span>
                    {selected && (
                      <span className="font-mono text-[11px] text-cosmo">
                        ●
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </FilterChip>
  );
}
