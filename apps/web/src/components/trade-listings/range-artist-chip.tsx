import { useArtists } from "@/hooks/use-artists";
import { m } from "@/i18n/messages";
import { type ValidArtist, validArtists } from "@apollo/cosmo/types/common";
import { CheckRow } from "../collection/artist-grouped-multiselect";
import { ArtistLogo } from "../collection/filter-artist-chip";
import FilterChip from "../collection/filter-chip";

type Props = {
  artists: readonly ValidArtist[];
  onChange: (artists: ValidArtist[]) => void;
};

/**
 * A range row's artists: any number of every artist, or any. The row
 * matches an objekt from any of them, so picking another only widens it.
 */
export default function RangeArtistChip({ artists, onChange }: Props) {
  const { artistList } = useArtists();
  const options = artistList
    .flatMap((option) => {
      const id = validArtists.find((valid) => valid === option.id);
      return id === undefined ? [] : [{ ...option, id }];
    })
    .toSorted((a, b) => a.comoTokenId - b.comoTokenId);
  const picked = options.filter((option) => artists.includes(option.id));

  // the toggled artist flips and the rest stay, in the list's order so the summary reads the same however they were picked
  function toggle(id: ValidArtist) {
    onChange(
      options
        .filter((option) => picked.includes(option) !== (option.id === id))
        .map((option) => option.id),
    );
  }

  return (
    <FilterChip
      label={m.market_listings_filter_artist()}
      valueLabel={
        picked.length > 1
          ? m.filter_value_multiple()
          : (picked[0]?.title ?? m.filter_value_any())
      }
      valueIcon={
        picked.length > 0 && (
          <span className="flex -space-x-1">
            {picked.map((option) => (
              <ArtistLogo
                key={option.id}
                src={option.logoImageUrl}
                className="ring-1 ring-background"
              />
            ))}
          </span>
        )
      }
      count={picked.length > 1 ? picked.length : undefined}
      active={picked.length > 0}
      width={200}
    >
      <div className="flex flex-col p-1">
        <CheckRow checked={picked.length === 0} onClick={() => onChange([])}>
          {/* lines its label up with the artists' beside their logos */}
          <span className="size-4 shrink-0" />
          {m.market_listings_any_artist()}
        </CheckRow>
        {options.map((option) => (
          <CheckRow
            key={option.id}
            checked={picked.includes(option)}
            onClick={() => toggle(option.id)}
          >
            <ArtistLogo src={option.logoImageUrl} />
            {option.title}
          </CheckRow>
        ))}
      </div>
    </FilterChip>
  );
}
