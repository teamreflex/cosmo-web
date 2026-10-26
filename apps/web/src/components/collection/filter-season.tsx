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
  allArtists?: boolean;
  /**
   * An Artist chip sits beside this one, so a chosen artist lists only its
   * own values instead of switching artists.
   */
  scopeToArtist?: boolean;
  /**
   * What the chip reads with nothing picked, in place of "all".
   */
  unsetLabel?: string;
};

export default function SeasonFilter(props: Props) {
  const { seasons } = useFilterData({ allArtists: props.allArtists });
  const value = props.seasons ?? [];
  const groups =
    props.scopeToArtist && props.artist
      ? seasons.filter((s) => s.artist.id === props.artist)
      : seasons;

  function handleChange(artist: string, season: string, checked: boolean) {
    props.onChange((prev) => {
      if (prev.artist !== artist) {
        return {
          // SAFETY: artist ids come from the fetched artist list
          artist: artist as ValidArtist,
          season: [season],
          // like the Artist chip, a new artist clears the values it owns
          ...(props.scopeToArtist && { member: undefined, class: undefined }),
        };
      }

      const newFilters = checked
        ? [...(prev.season ?? []), season]
        : (prev.season ?? []).filter((f) => f !== season);
      const next = newFilters.length > 0 ? newFilters : undefined;

      // beside an Artist chip, the artist stays chosen without a season
      return props.scopeToArtist
        ? { season: next }
        : { artist: next ? artist : undefined, season: next };
    });
  }

  function handleClear() {
    props.onChange(
      props.scopeToArtist
        ? { season: undefined }
        : { artist: undefined, season: undefined },
    );
  }

  const valueLabel =
    value.length === 0
      ? (props.unsetLabel ?? m.filter_value_all())
      : value.length === 1
        ? (value[0] ?? "")
        : m.filter_value_multiple();

  return (
    <FilterChip
      label={m.common_season()}
      valueLabel={valueLabel}
      count={value.length}
      active={value.length > 0}
      width={groups.length === 1 ? 160 : 420}
    >
      <ArtistGroupedMultiSelect
        groups={groups.map((s) => ({
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
