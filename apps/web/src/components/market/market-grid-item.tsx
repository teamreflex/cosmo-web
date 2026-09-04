import { m } from "@/i18n/messages";
import type { MarketItem } from "@/lib/universal/market";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { formatPrice } from "@/lib/utils";
import { useMemo, useState } from "react";
import { ObjektSidebar } from "../objekt/common";
import ExpandableObjekt from "../objekt/objekt-expandable";
import PriceOverlay from "../objekt/price-overlay";
import ListingsDialog from "./listings-dialog";

type Props = {
  item: MarketItem;
  id: string;
  priority: boolean;
};

export function MarketGridItem({ item, priority }: Props) {
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
        <PriceOverlay
          collection={collection}
          label={m.market_from()}
          price={formatPrice(item.floorUsd, "USD")}
          trailing={m.market_listed_count({
            count: item.listingCount.toString(),
          })}
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
