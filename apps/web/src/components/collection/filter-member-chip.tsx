import { useArtists } from "@/hooks/use-artists";
import type { CosmoFilters } from "@/hooks/use-cosmo-filters";
import { m } from "@/i18n/messages";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import ArtistGroupedMultiSelect from "./artist-grouped-multiselect";
import type { ArtistValueToggle } from "./artist-value-toggle";
import FilterChip from "./filter-chip";

type Props = {
  members: CosmoFilters["member"];
  /**
   * The artists chosen in the Artist chip beside this one, none meaning any.
   * Only their members are listed, or every artist's with none.
   */
  artists: readonly ValidArtist[];
  onToggle: (change: ArtistValueToggle) => void;
  onClear: () => void;
  /**
   * Lists every artist's members rather than only the navbar's selection.
   */
  allArtists?: boolean;
  /**
   * What the chip reads with nothing picked, in place of "all".
   */
  unsetLabel?: string;
};

/**
 * Members grouped by artist. A member names their artist, so several can be
 * picked across artists, and each shows checked in their own group.
 */
export default function MemberFilterChip(props: Props) {
  const { artistList, selected } = useArtists();
  const artists = (props.allArtists ? artistList : selected)
    .filter(
      (artist) =>
        props.artists.length === 0 ||
        props.artists.some((a) => a === artist.id),
    )
    .toSorted((a, b) => a.comoTokenId - b.comoTokenId);
  const value = props.members ?? [];

  const valueLabel =
    value.length === 0
      ? (props.unsetLabel ?? m.filter_value_all())
      : value.length === 1
        ? (value[0] ?? "")
        : m.filter_value_multiple();

  return (
    <FilterChip
      label={m.market_listings_filter_member()}
      valueLabel={valueLabel}
      count={value.length}
      active={value.length > 0}
      width={artists.length === 1 ? 200 : 420}
    >
      <div className="max-h-[min(28rem,70dvh)] overflow-y-auto">
        <ArtistGroupedMultiSelect
          groups={artists.map((artist) => ({
            artist: {
              id: artist.id,
              title: artist.title,
              logoImageUrl: artist.logoImageUrl,
            },
            items: artist.artistMembers.map((member) => member.name),
          }))}
          checkedUnder={[]}
          selected={value}
          onToggle={props.onToggle}
          onClear={props.onClear}
          selectedCount={value.length}
        />
      </div>
    </FilterChip>
  );
}
