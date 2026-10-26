import { m } from "@/i18n/messages";
import { getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import type { ComposerShown } from "@/lib/client/trade-listings";
import { IconX } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "../ui/item";

type Props = {
  /** the row's place among the wants, from 1, naming its remove button */
  position: number;
  count: number;
  slug: string;
  shown: ComposerShown | undefined;
  stepper: ReactNode;
  onRemove: () => void;
};

/**
 * A want row for copies of one collection: its thumbnail and name, how
 * many, and a way to drop it. Below sm the stepper drops to a second line,
 * so the badge and the name keep one line.
 */
export default function ComposerExactRow({
  position,
  count,
  slug,
  shown,
  stepper,
  onRemove,
}: Props) {
  const collection = shown?.collection ?? null;

  return (
    <Item variant="outline" size="sm" className="bg-background sm:flex-nowrap">
      <ItemMedia className="aspect-photocard w-8 overflow-hidden rounded-[3px]">
        {collection === null ? (
          <span className="size-full bg-muted" />
        ) : (
          <img
            src={getObjektFrontImageUrl(collection, "xs")}
            alt=""
            className="size-full object-cover"
          />
        )}
      </ItemMedia>
      <ItemContent className="min-w-0">
        <span className="flex items-center gap-2">
          <Badge variant="outline">{m.listing_detail_kind_exact()}</Badge>
          <ItemTitle dir="auto" className="min-w-0 break-words">
            {shown?.name ?? slug}
          </ItemTitle>
        </span>
      </ItemContent>
      <ItemActions className="max-sm:order-last max-sm:basis-full max-sm:pl-10.5">
        {stepper}
      </ItemActions>
      <ItemActions>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={m.listing_composer_remove_row({
            position,
            row: `${count}× ${shown?.name ?? slug}`,
          })}
          onClick={onRemove}
          className="text-muted-foreground"
        >
          <IconX />
        </Button>
      </ItemActions>
    </Item>
  );
}
