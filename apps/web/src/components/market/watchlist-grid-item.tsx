import { m } from "@/i18n/messages";
import { Objekt } from "@/lib/universal/objekt-conversion";
import type { WatchlistItem } from "@/lib/universal/watchlist";
import { useMemo, useState } from "react";
import { ObjektCount, ObjektSidebar } from "../objekt/common";
import ExpandableObjekt from "../objekt/objekt-expandable";
import PriceDisplay from "../objekt/price-display";
import PriceOverlay from "../objekt/price-overlay";
import ListingsDialog from "./listings-dialog";
import { WatchOverlay } from "./watch-button";

type Props = {
  item: WatchlistItem;
  id: string;
  priority: boolean;
};

export function WatchlistGridItem({ item, priority }: Props) {
  const collection = useMemo(() => Objekt.fromIndexer(item), [item]);
  const [open, setOpen] = useState(false);

  return (
    <>
      <ExpandableObjekt
        collection={collection}
        priority={priority}
        onClick={() => setOpen(true)}
      >
        <ObjektSidebar collection={collection} />
        <WatchOverlay collection={collection} />
        {/* below the watch chip, which is h-5 / sm:h-9 */}
        <ObjektCount count={item.listingCount} className="top-6 sm:top-11" />
        <PriceOverlay
          collection={collection}
          label={item.floorUsd === null ? undefined : m.market_from()}
          price={
            item.floorUsd === null ? (
              m.watchlist_no_listings()
            ) : (
              <PriceDisplay usd={item.floorUsd} />
            )
          }
        />
      </ExpandableObjekt>

      <ListingsDialog
        collection={collection}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
