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
};

export default function ClassFilter(props: Props) {
  const { classes } = useFilterData();
  const value = props.classes ?? [];

  function handleChange(artistId: string, className: string, checked: boolean) {
    props.onChange((prev) => {
      if (prev.artist !== artistId) {
        return {
          artist: artistId as ValidArtist,
          class: [className],
        };
      }

      const newFilters = checked
        ? [...(prev.class ?? []), className]
        : (prev.class ?? []).filter((f) => f !== className);

      return {
        artist: newFilters.length > 0 ? artistId : undefined,
        class: newFilters.length > 0 ? newFilters : undefined,
      };
    });
  }

  function handleClear() {
    props.onChange({ artist: undefined, class: undefined });
  }

  const valueLabel =
    value.length === 0
      ? m.filter_value_all()
      : value.length === 1
        ? (value[0] ?? "")
        : m.filter_value_multiple();

  return (
    <FilterChip
      label={m.common_class()}
      valueLabel={valueLabel}
      count={value.length}
      active={value.length > 0}
      width={420}
    >
      <ArtistGroupedMultiSelect
        groups={classes.map((c) => ({
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
