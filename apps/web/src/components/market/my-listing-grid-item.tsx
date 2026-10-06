import { useDisplayCurrency } from "@/hooks/use-display-currency";
import { m } from "@/i18n/messages";
import type { MyListingItem, MyListingStatus } from "@/lib/universal/market";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { memo, useMemo, useState } from "react";
import EditEntryDialog from "../lists/edit-entry-dialog";
import SalePriceOverlay, { PriceBadge } from "../lists/sale-price-overlay";
import { ObjektCount, ObjektSidebar } from "../objekt/common";
import ExpandableObjekt from "../objekt/objekt-expandable";
import ListingsDialog from "./listings-dialog";

type Props = {
  item: MyListingItem;
  id: string;
  priority: boolean;
};

/**
 * One of the viewer's sale serials with its market standing. A click edits
 * the entry, whose price check compares it with the other listings.
 */
export const MyListingGridItem = memo(function MyListingGridItem({
  item,
  priority,
}: Props) {
  const collection = useMemo(() => Objekt.fromIndexer(item), [item]);
  const [editOpen, setEditOpen] = useState(false);
  const [listingsOpen, setListingsOpen] = useState(false);

  return (
    <>
      <ExpandableObjekt
        collection={collection}
        priority={priority}
        onClick={() => setEditOpen(true)}
      >
        <ObjektSidebar
          collection={collection}
          serial={item.entrySerial ?? undefined}
        />
        <ObjektCount count={item.entryQuantity} />
        <SalePriceOverlay
          collection={collection}
          price={item.entryPrice}
          currency={item.listCurrency}
          rateToUsd={item.listRateToUsd}
          badge={
            <StatusBadge status={item.status} priceUsd={item.entryPriceUsd} />
          }
          editable
        />
      </ExpandableObjekt>

      <ListingsDialog
        collection={collection}
        open={listingsOpen}
        onOpenChange={setListingsOpen}
        pinnedEntryId={item.entryPrice === null ? undefined : item.id}
      />

      <EditEntryDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        objektListId={item.listId}
        objektListEntryId={item.id}
        tokenId={item.entryTokenId}
        quantity={item.entryQuantity}
        price={item.entryPrice}
        currency={item.listCurrency}
        rateToUsd={item.listRateToUsd}
        slug={collection.slug}
        collectionId={collection.collectionId}
        onViewListings={() => {
          setEditOpen(false);
          setListingsOpen(true);
        }}
      />
    </>
  );
});

type StatusBadgeProps = {
  status: MyListingStatus;
  priceUsd: number | null;
};

function StatusBadge({ status, priceUsd }: StatusBadgeProps) {
  const viewer = useDisplayCurrency();

  switch (status.kind) {
    case "floor":
      return <PriceBadge tone="floor">{m.listings_stat_floor()}</PriceBadge>;
    case "undercut":
      return (
        <PriceBadge tone="undercut">
          {priceUsd === null
            ? m.my_listings_status_undercut()
            : m.my_listings_floor_gap({
                percent: formatGap(priceUsd / status.floorUsd),
                floor: viewer.formatUsd(status.floorUsd),
              })}
        </PriceBadge>
      );
    case "onlySeller":
      return (
        <PriceBadge tone="neutral">
          {m.my_listings_status_only_seller()}
        </PriceBadge>
      );
    case "offMarket":
      return (
        <PriceBadge tone="neutral">
          {m.my_listings_status_off_market()}
        </PriceBadge>
      );
    case "unpriced":
      return null;
  }
}

/**
 * How far above the floor, as a whole percentage. A gap under 1% shows as
 * such rather than rounding to +0%, since the serial still isn't the floor.
 */
function formatGap(ratio: number) {
  const percent = (ratio - 1) * 100;
  return percent < 1 ? "<1%" : `${Math.round(percent)}%`;
}
