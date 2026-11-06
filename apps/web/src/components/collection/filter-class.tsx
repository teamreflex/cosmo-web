import type { CosmoFilters } from "@/hooks/use-cosmo-filters";
import { useFilterData } from "@/hooks/use-filter-data";
import { m } from "@/i18n/messages";
import { classSort } from "@/lib/utils";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import ArtistGroupedMultiSelect from "./artist-grouped-multiselect";
import type { ArtistValueToggle } from "./artist-value-toggle";
import FilterChip from "./filter-chip";

type Props = {
  classes: CosmoFilters["class"];
  /**
   * The artists the picked classes apply to, none meaning any. A class is
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
 * Classes grouped by artist. The chip only reports what was toggled; how
 * that moves the artist is up to whoever holds the filters.
 */
export default function ClassFilter(props: Props) {
  const { classes } = useFilterData({ allArtists: props.allArtists });
  const value = props.classes ?? [];
  const groups =
    props.scoped && props.artists.length > 0
      ? classes.filter((c) => props.artists.some((a) => a === c.artist.id))
      : classes;

  const valueLabel =
    value.length === 0
      ? (props.unsetLabel ?? m.filter_value_all())
      : value.length === 1
        ? (value[0] ?? "")
        : m.filter_value_multiple();

  return (
    <FilterChip
      label={m.common_class()}
      valueLabel={valueLabel}
      count={value.length}
      active={value.length > 0}
      width={groups.length === 1 ? 160 : 420}
    >
      <ArtistGroupedMultiSelect
        groups={groups.map((c) => ({
          artist: {
            id: c.artist.id,
            title: c.artist.title,
            logoImageUrl: c.artist.logoImageUrl,
          },
          items: [...c.classes].sort((a, b) => classSort(a, b, c.artist.id)),
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
