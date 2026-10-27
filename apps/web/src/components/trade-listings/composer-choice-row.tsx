import { m } from "@/i18n/messages";
import type { ComposerShown } from "@/lib/client/trade-listings";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { MAX_CHOICE_OPTIONS } from "@apollo/trades/caps";
import { IconPlus, IconX } from "@tabler/icons-react";
import { type ReactNode, useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import ComposerExactSearch from "./composer-exact-search";
import { RemovableTile, TileCaption } from "./composer-offered";

type Props = {
  /** the row's place among the wants, from 1, naming its remove button */
  position: number;
  count: number;
  slugs: readonly string[];
  collections: ReadonlyMap<string, ComposerShown>;
  stepper: ReactNode;
  onChange: (slugs: string[]) => void;
  onCollection: (collection: Objekt.Collection) => void;
  onRemove: () => void;
};

/**
 * A want row for any mix of a few named collections, copies included: the
 * collections as cards, each removable, and a slot that opens the
 * collection search. A new row starts with the search open. The search
 * stays open as collections are picked, picking one the row names takes it
 * out again, and it closes once the row names MAX_CHOICE_OPTIONS.
 */
export default function ComposerChoiceRow({
  position,
  count,
  slugs,
  collections,
  stepper,
  onChange,
  onCollection,
  onRemove,
}: Props) {
  const [searching, setSearching] = useState(slugs.length === 0);
  const full = slugs.length >= MAX_CHOICE_OPTIONS;

  function toggle(collection: Objekt.Collection) {
    if (slugs.includes(collection.slug)) {
      onChange(slugs.filter((slug) => slug !== collection.slug));
      return;
    }
    if (full) return;
    onCollection(collection);
    onChange([...slugs, collection.slug]);
    if (slugs.length + 1 >= MAX_CHOICE_OPTIONS) setSearching(false);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3 md:p-3.5">
      {/* below sm the stepper drops under the badge and its words */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <Badge variant="outline">{m.listing_detail_kind_choice()}</Badge>
        <span className="min-w-0 flex-1 text-xs text-muted-foreground">
          {m.listing_composer_choice_help()}
        </span>
        <span className="shrink-0 max-sm:order-last max-sm:basis-full">
          {stepper}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={m.listing_composer_remove_row({
            position,
            row: `${count}× ${m.listing_want_any_of_count({ count: slugs.length })}`,
          })}
          onClick={onRemove}
          className="shrink-0 text-muted-foreground"
        >
          <IconX />
        </Button>
      </div>

      <ul className="flex flex-wrap items-start gap-3">
        {slugs.map((slug) => {
          const shown = collections.get(slug);
          return (
            <li key={slug} className="flex w-16 flex-col gap-1.5 md:w-20">
              <RemovableTile
                shown={shown ?? { name: slug, serial: null, collection: null }}
                refusal={undefined}
                onRemove={() =>
                  onChange(slugs.filter((picked) => picked !== slug))
                }
              />
              {shown !== undefined && <TileCaption shown={shown} />}
            </li>
          );
        })}
        {!full && (
          <li className="w-16 md:w-20">
            <button
              type="button"
              aria-expanded={searching}
              aria-label={m.listing_composer_choice_add_label()}
              onClick={() => setSearching((open) => !open)}
              className="flex aspect-photocard w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input p-1.5 text-center text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-2 focus-visible:outline-cosmo"
            >
              <IconPlus className="size-4" />
              {m.listing_composer_choice_add()}
            </button>
          </li>
        )}
      </ul>

      {searching && (
        <ComposerExactSearch
          picked={new Set(slugs)}
          onPick={toggle}
          onClose={() => setSearching(false)}
        />
      )}
      {full && (
        <p className="text-xs text-muted-foreground">
          {m.listing_composer_choice_full({ max: MAX_CHOICE_OPTIONS })}
        </p>
      )}
    </div>
  );
}
