import { useUserState } from "@/hooks/use-user-state";
import { m } from "@/i18n/messages";
import type { MarketItem } from "@/lib/universal/market";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { Suspense, useMemo, useState } from "react";
import { ObjektCount, ObjektSidebar } from "../objekt/common";
import ExpandableObjekt from "../objekt/objekt-expandable";
import PriceDisplay from "../objekt/price-display";
import PriceOverlay from "../objekt/price-overlay";
import ListingsDialog from "./listings-dialog";
import { WatchOverlay } from "./watch-button";

type Props = {
  item: MarketItem;
  id: string;
  priority: boolean;
};

export function MarketGridItem({ item, priority }: Props) {
  const { user } = useUserState();
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
        {user === undefined ? (
          <ObjektCount count={item.listingCount} />
        ) : (
          <>
            {/* suspends on the watched slugs; pops in once they load */}
            <Suspense fallback={null}>
              <WatchOverlay collection={collection} />
            </Suspense>
            {/* below the watch chip, which is h-5 / sm:h-9 */}
            <ObjektCount
              count={item.listingCount}
              className="top-6 sm:top-11"
            />
          </>
        )}
        <PriceOverlay
          collection={collection}
          label={m.market_from()}
          price={<PriceDisplay usd={item.floorUsd} />}
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
