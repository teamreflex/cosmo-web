import { useArtists } from "@/hooks/use-artists";
import type { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import { m } from "@/i18n/messages";
import { validArtists } from "@apollo/cosmo/types/common";
import FilterChip from "./filter-chip";
import SingleSelectList, {
  type SingleSelectOption,
} from "./single-select-list";

type Props = {
  artist: CosmoFilters["artist"];
  onChange: SetCosmoFilters;
  /**
   * Offers every artist rather than only the navbar's selection.
   */
  allArtists?: boolean;
  /**
   * What the chip reads with nothing picked, in place of "all".
   */
  unsetLabel?: string;
};

/**
 * One artist, or any. Members, seasons and classes belong to an artist, so
 * switching artists clears them.
 */
export default function ArtistFilterChip({
  artist,
  onChange,
  allArtists = false,
  unsetLabel = m.filter_value_all(),
}: Props) {
  const { artistList, selected } = useArtists();
  const artists = (allArtists ? artistList : selected).toSorted(
    (a, b) => a.comoTokenId - b.comoTokenId,
  );
  const current = artists.find((option) => option.id === artist);

  const options: SingleSelectOption<string>[] = [
    {
      value: "any",
      label: m.market_listings_any_artist(),
      // lines its label up with the artists' beside their logos
      icon: <span className="size-4 shrink-0" />,
    },
    ...artists.map((option) => ({
      value: option.id,
      label: option.title,
      icon: <ArtistLogo src={option.logoImageUrl} />,
    })),
  ];

  function handleChange(value: string) {
    const next = validArtists.find((id) => id === value);
    if (next === artist) return;
    onChange({
      artist: next,
      member: undefined,
      season: undefined,
      class: undefined,
    });
  }

  return (
    <FilterChip
      label={m.market_listings_filter_artist()}
      valueLabel={current?.title ?? unsetLabel}
      valueIcon={current && <ArtistLogo src={current.logoImageUrl} />}
      active={current !== undefined}
      width={200}
    >
      {({ close }) => (
        <SingleSelectList
          options={options}
          value={current?.id ?? "any"}
          onChange={handleChange}
          close={close}
        />
      )}
    </FilterChip>
  );
}

function ArtistLogo({ src }: { src: string }) {
  return <img src={src} alt="" className="size-4 shrink-0 rounded-full" />;
}
