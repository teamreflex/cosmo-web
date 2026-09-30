import { useArtists } from "@/hooks/use-artists";
import type { NeighbourSuggestion } from "@/lib/universal/binders";
import { suggestionSource, suggestionSummary } from "./picker-filters";

type Props = {
  suggestion: NeighbourSuggestion;
  /** lead with the pockets it comes from, for the chip row */
  withSource?: boolean;
  onApply: () => void;
};

/**
 * The neighbour suggestion as a dashed chip. Tapping applies it; it's never
 * applied on its own.
 */
export default function SuggestionChip({
  suggestion,
  withSource = false,
  onApply,
}: Props) {
  const { getArtist } = useArtists();
  const summary = suggestionSummary(
    suggestion,
    getArtist(suggestion.artist)?.title ?? suggestion.artist,
  );

  return (
    <button
      type="button"
      onClick={onApply}
      className="inline-flex h-[26px] shrink-0 items-center gap-1.5 rounded-full border border-dashed border-cosmo-text/60 px-2.5 text-xs whitespace-nowrap text-cosmo transition-colors hover:bg-cosmo/10 dark:text-cosmo-text"
    >
      {withSource ? (
        <>
          {suggestionSource(suggestion, "like")}
          <b className="font-semibold text-foreground">{summary}</b>
        </>
      ) : (
        summary
      )}
    </button>
  );
}
