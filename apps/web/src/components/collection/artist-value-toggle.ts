import type { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import type { ValidArtist } from "@apollo/cosmo/types/common";

/**
 * A value checked or unchecked under an artist's group in a member, season
 * or class chip, with the values its column holds afterwards.
 */
export type ArtistValueToggle = {
  artist: ValidArtist;
  value: string;
  values: string[];
};

/**
 * A season or class chip wired to the objekt filters, which hold one artist,
 * none meaning any. Picking a value under another artist switches to that
 * artist with only that value. Beside an Artist chip (`scoped`), switching
 * also clears the other values tied to the old artist, and the artist stays
 * chosen without a value; otherwise the artist follows the column and clears
 * with its last value.
 */
export function singleArtistChip(
  column: "season" | "class",
  artist: CosmoFilters["artist"],
  setFilters: SetCosmoFilters,
  { scoped = false }: { scoped?: boolean } = {},
) {
  const set = (values: string[] | undefined): Partial<CosmoFilters> =>
    column === "season" ? { season: values } : { class: values };
  const others: Partial<CosmoFilters> =
    column === "season"
      ? { member: undefined, class: undefined }
      : { member: undefined, season: undefined };

  return {
    artists: artist ? [artist] : [],
    scoped,
    onToggle: (change: ArtistValueToggle) =>
      setFilters((prev) => {
        if (prev.artist !== change.artist) {
          return {
            artist: change.artist,
            ...set([change.value]),
            ...(scoped && others),
          };
        }
        const next = change.values.length > 0 ? change.values : undefined;
        return scoped
          ? set(next)
          : { artist: next ? change.artist : undefined, ...set(next) };
      }),
    onClear: () =>
      setFilters(
        scoped ? set(undefined) : { artist: undefined, ...set(undefined) },
      ),
  };
}
