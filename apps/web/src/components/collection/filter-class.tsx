import type { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import { useFilterData } from "@/hooks/use-filter-data";
import { m } from "@/i18n/messages";
import { classSort } from "@/lib/utils";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import ArtistGroupedMultiSelect from "./artist-grouped-multiselect";
import FilterChip from "./filter-chip";

type Props = {
  classes: CosmoFilters["class"];
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

export default function ClassFilter(props: Props) {
  const { classes } = useFilterData({ allArtists: props.allArtists });
  const value = props.classes ?? [];
  const groups =
    props.scopeToArtist && props.artist
      ? classes.filter((c) => c.artist.id === props.artist)
      : classes;

  function handleChange(artistId: string, className: string, checked: boolean) {
    props.onChange((prev) => {
      if (prev.artist !== artistId) {
        return {
          // SAFETY: artist ids come from the fetched artist list
          artist: artistId as ValidArtist,
          class: [className],
          // like the Artist chip, a new artist clears the values it owns
          ...(props.scopeToArtist && { member: undefined, season: undefined }),
        };
      }

      const newFilters = checked
        ? [...(prev.class ?? []), className]
        : (prev.class ?? []).filter((f) => f !== className);
      const next = newFilters.length > 0 ? newFilters : undefined;

      // beside an Artist chip, the artist stays chosen without a class
      return props.scopeToArtist
        ? { class: next }
        : { artist: next ? artistId : undefined, class: next };
    });
  }

  function handleClear() {
    props.onChange(
      props.scopeToArtist
        ? { class: undefined }
        : { artist: undefined, class: undefined },
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
        activeArtist={props.artist ?? undefined}
        selected={value}
        onToggle={handleChange}
        onClear={handleClear}
        selectedCount={value.length}
      />
    </FilterChip>
  );
}
