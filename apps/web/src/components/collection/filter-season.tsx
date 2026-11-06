import type { CosmoFilters } from "@/hooks/use-cosmo-filters";
import { useFilterData } from "@/hooks/use-filter-data";
import { m } from "@/i18n/messages";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import ArtistGroupedMultiSelect from "./artist-grouped-multiselect";
import type { ArtistValueToggle } from "./artist-value-toggle";
import FilterChip from "./filter-chip";

type Props = {
  seasons: CosmoFilters["season"];
  /**
   * The artists the picked seasons apply to, none meaning any. A season is
   * stored by name alone, so it shows checked under each of them.
   */
  artists: readonly ValidArtist[];
  /**
   * An Artist chip sits beside this one, so only `artists`' groups are
   * listed, or every artist's with none.
   */
  scoped: boolean;
  onToggle: (change: ArtistValueToggle) => void;
  onClear: () => void;
  allArtists?: boolean;
  /**
   * What the chip reads with nothing picked, in place of "all".
   */
  unsetLabel?: string;
};

/**
 * Seasons grouped by artist. The chip only reports what was toggled; how
 * that moves the artist is up to whoever holds the filters.
 */
export default function SeasonFilter(props: Props) {
  const { seasons } = useFilterData({ allArtists: props.allArtists });
  const value = props.seasons ?? [];
  const groups =
    props.scoped && props.artists.length > 0
      ? seasons.filter((s) => props.artists.some((a) => a === s.artist.id))
      : seasons;

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
        checkedUnder={props.artists}
        selected={value}
        onToggle={props.onToggle}
        onClear={props.onClear}
        selectedCount={value.length}
      />
    </FilterChip>
  );
}
