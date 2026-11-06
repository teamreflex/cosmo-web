import type {
  EventsFilters,
  SetEventsFilters,
} from "@/hooks/use-events-filters";
import { useFilterData } from "@/hooks/use-filter-data";
import { m } from "@/i18n/messages";
import ArtistGroupedMultiSelect from "../collection/artist-grouped-multiselect";
import type { ArtistValueToggle } from "../collection/artist-value-toggle";
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

  function handleChange(change: ArtistValueToggle) {
    onChange((prev) => {
      if (prev.artist !== change.artist) {
        return {
          artist: change.artist,
          season: [change.value],
          era: undefined,
        };
      }

      return {
        artist: change.values.length > 0 ? change.artist : undefined,
        season: change.values.length > 0 ? change.values : undefined,
      };
    });
  }

  function handleClear() {
    onChange({ artist: undefined, season: undefined });
  }

  const first = value[0];
  const valueLabel =
    first === undefined
      ? m.filter_value_all()
      : value.length === 1
        ? first
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
        checkedUnder={artist ? [artist] : []}
        selected={value}
        onToggle={handleChange}
        onClear={handleClear}
        selectedCount={value.length}
      />
    </FilterChip>
  );
}
