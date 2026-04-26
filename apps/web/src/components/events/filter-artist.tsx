import { useArtists } from "@/hooks/use-artists";
import type {
  EventsFilters,
  SetEventsFilters,
} from "@/hooks/use-events-filters";
import { m } from "@/i18n/messages";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import FilterChip from "../collection/filter-chip";
import SingleSelectList, {
  type SingleSelectOption,
} from "../collection/single-select-list";

type ArtistValue = "all" | ValidArtist;

type Props = {
  artist: EventsFilters["artist"];
  onChange: SetEventsFilters;
};

export default function EventsArtistFilter({ artist, onChange }: Props) {
  const { artistList } = useArtists();

  const value: ArtistValue = artist ?? "all";

  const options: SingleSelectOption<ArtistValue>[] = [
    { value: "all", label: m.filter_value_all() },
    ...artistList.map((a) => ({
      value: a.id as ValidArtist,
      label: a.title,
    })),
  ];

  function handleChange(newValue: ArtistValue) {
    onChange({
      artist: newValue === "all" ? undefined : newValue,
      season: undefined,
      era: undefined,
    });
  }

  const selectedArtist = artist
    ? artistList.find((a) => a.id === artist)
    : undefined;
  const valueLabel =
    value === "all"
      ? m.filter_value_all()
      : (selectedArtist?.title.toLowerCase() ?? m.filter_value_all());

  return (
    <FilterChip
      label={m.objekt_attribute_artist()}
      valueLabel={valueLabel}
      active={artist !== undefined}
      width={220}
    >
      {({ close }) => (
        <SingleSelectList
          options={options}
          value={value}
          onChange={handleChange}
          close={close}
        />
      )}
    </FilterChip>
  );
}
