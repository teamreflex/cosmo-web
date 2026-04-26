import type {
  EventsFilters,
  SetEventsFilters,
} from "@/hooks/use-events-filters";
import { useFilterData } from "@/hooks/use-filter-data";
import { m } from "@/i18n/messages";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import ArtistGroupedMultiSelect from "../collection/artist-grouped-multiselect";
import FilterChip from "../collection/filter-chip";

type Props = {
  seasons: EventsFilters["season"];
  artist: EventsFilters["artist"];
  onChange: SetEventsFilters;
};

export default function EventsSeasonFilter({
  seasons,
  artist,
  onChange,
}: Props) {
  const { seasons: seasonsData } = useFilterData();
  const value = seasons ?? [];

  function handleChange(artistId: string, season: string, checked: boolean) {
    onChange((prev) => {
      if (prev.artist !== artistId) {
        return {
          artist: artistId as ValidArtist,
          season: [season],
          era: undefined,
        };
      }

      const newSeasons = checked
        ? [...(prev.season ?? []), season]
        : (prev.season ?? []).filter((s) => s !== season);

      return {
        artist: newSeasons.length > 0 ? artistId : undefined,
        season: newSeasons.length > 0 ? newSeasons : undefined,
      };
    });
  }

  function handleClear() {
    onChange({ artist: undefined, season: undefined });
  }

  const valueLabel =
    value.length === 0
      ? m.filter_value_all()
      : value.length === 1
        ? value[0]!
        : m.filter_value_multiple();

  return (
    <FilterChip
      label={m.common_season()}
      valueLabel={valueLabel}
      count={value.length}
      active={value.length > 0}
      width={420}
    >
      <ArtistGroupedMultiSelect
        groups={seasonsData.map((s) => ({
          artist: {
            id: s.artist.id,
            title: s.artist.title,
            logoImageUrl: s.artist.logoImageUrl,
          },
          items: s.seasons,
        }))}
        activeArtist={artist ?? undefined}
        selected={value}
        onToggle={handleChange}
        onClear={handleClear}
        selectedCount={value.length}
      />
    </FilterChip>
  );
}
