import { m } from "@/i18n/messages";
import { getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import { collectionSearchQuery } from "@/lib/queries/objekt-queries";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { IconRefresh } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { Button } from "../ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Spinner } from "../ui/spinner";

type Props = {
  onPick: (collection: Objekt.Collection) => void;
  onClose: () => void;
};

/**
 * Finds one collection for an exact row by searching every collection, as
 * the objekt index's search does. Picking one adds it, or raises the count
 * of the row that already asks for it.
 */
export default function ComposerExactSearch({ onPick, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [settled] = useDebounceValue(query.trim(), 250);
  const search = useQuery({
    ...collectionSearchQuery(settled),
    enabled: settled.length > 0,
  });
  const results = (search.data ?? []).map(Objekt.fromIndexer);

  return (
    <Command
      shouldFilter={false}
      className="h-auto rounded-lg! border border-border bg-background"
      onKeyDown={(event) => {
        // closes the search, not the composer around it
        if (event.key !== "Escape") return;
        event.stopPropagation();
        onClose();
      }}
    >
      <CommandInput
        autoFocus
        value={query}
        onValueChange={setQuery}
        onClose={onClose}
        placeholder={m.listing_composer_search_placeholder()}
        aria-label={m.listing_composer_search_placeholder()}
      />
      <CommandList className="max-h-64">
        {settled.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">
            {m.listing_composer_search_hint()}
          </p>
        ) : search.isError ? (
          <div className="flex flex-col items-center gap-2 px-3 py-4 text-center text-sm">
            <p role="alert" className="text-muted-foreground">
              {m.listing_composer_search_error()}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void search.refetch()}
            >
              <IconRefresh /> {m.common_retry()}
            </Button>
          </div>
        ) : search.isPending ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : (
          <>
            <CommandEmpty>{m.listing_composer_search_empty()}</CommandEmpty>
            <CommandGroup>
              {results.map((collection) => (
                <CommandItem
                  key={collection.slug}
                  value={collection.slug}
                  onSelect={() => onPick(collection)}
                  className="gap-3"
                >
                  <img
                    src={getObjektFrontImageUrl(collection, "xs")}
                    alt=""
                    className="h-9 w-6 shrink-0 rounded-[2px] bg-muted object-cover"
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">
                      {collection.season} {collection.member}{" "}
                      {collection.collectionNo}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {collection.artistName} · {collection.class}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </Command>
  );
}
