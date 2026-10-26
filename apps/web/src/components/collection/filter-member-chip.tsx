import { useArtists } from "@/hooks/use-artists";
import type { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import { m } from "@/i18n/messages";
import ArtistGroupedMultiSelect from "./artist-grouped-multiselect";
import FilterChip from "./filter-chip";

type Props = {
  members: CosmoFilters["member"];
  artist: CosmoFilters["artist"];
  onChange: SetCosmoFilters;
  /**
   * Lists every artist's members rather than only the navbar's selection.
   */
  allArtists?: boolean;
  /**
   * An Artist chip sits beside this one, so a chosen artist lists only its
   * own members.
   */
  scopeToArtist?: boolean;
  /**
   * What the chip reads with nothing picked, in place of "all".
   */
  unsetLabel?: string;
};

/**
 * Members grouped by artist. A member names their artist, so several can be
 * picked across artists; picking one outside the chosen artist clears it.
 */
export default function MemberFilterChip(props: Props) {
  const { artistList, selected } = useArtists();
  const artists = (props.allArtists ? artistList : selected)
    .filter(
      (artist) =>
        !props.scopeToArtist || !props.artist || artist.id === props.artist,
    )
    .toSorted((a, b) => a.comoTokenId - b.comoTokenId);
  const value = props.members ?? [];

  function handleToggle(artistId: string, member: string, checked: boolean) {
    props.onChange((prev) => {
      const next = checked
        ? [...(prev.member ?? []), member]
        : (prev.member ?? []).filter((name) => name !== member);
      return {
        member: next.length > 0 ? next : undefined,
        artist:
          checked && prev.artist != null && prev.artist !== artistId
            ? undefined
            : prev.artist,
      };
    });
  }

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
          activeArtist={props.artist ?? undefined}
          anyArtist
          selected={value}
          onToggle={handleToggle}
          onClear={() => props.onChange({ member: undefined })}
          selectedCount={value.length}
        />
      </div>
    </FilterChip>
  );
}
