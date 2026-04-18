import type { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import { useFilterData } from "@/hooks/use-filter-data";
import { m } from "@/i18n/messages";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import ArtistGroupedMultiSelect from "./artist-grouped-multiselect";
import FilterChip from "./filter-chip";

type Props = {
  seasons: CosmoFilters["season"];
  artist: CosmoFilters["artist"];
  onChange: SetCosmoFilters;
};

export default function SeasonFilter(props: Props) {
  const { seasons } = useFilterData();
  const value = props.seasons ?? [];

  function handleChange(artist: string, season: string, checked: boolean) {
    props.onChange((prev) => {
      if (prev.artist !== artist) {
        return {
          artist: artist as ValidArtist,
          season: [season],
        };
      }

      const newFilters = checked
        ? [...(prev.season ?? []), season]
        : (prev.season ?? []).filter((f) => f !== season);

      return {
        artist: newFilters.length > 0 ? artist : undefined,
        season: newFilters.length > 0 ? newFilters : undefined,
      };
    });
  }

  function handleClear() {
    props.onChange({ artist: undefined, season: undefined });
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
        groups={seasons.map((s) => ({
          artist: {
            id: s.artist.id,
            title: s.artist.title,
            logoImageUrl: s.artist.logoImageUrl,
          },
          items: s.seasons,
        }))}
        activeArtist={props.artist ?? undefined}
        selected={value}
        onToggle={handleChange}
        onClear={handleClear}
        selectedCount={value.length}
      />
    </FilterChip>
  );
}
