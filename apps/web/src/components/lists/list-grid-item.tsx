import { useDisplayCurrency } from "@/hooks/use-display-currency";
import type { ObjektListItem } from "@/lib/functions/objekts/objekt-list";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { formatPrice } from "@/lib/utils";
import type { ObjektList } from "@apollo/database/web/types";
import { useMemo, useState } from "react";
import ListingsDialog from "../market/listings-dialog";
import { ObjektSidebar } from "../objekt/common";
import ExpandableObjekt from "../objekt/objekt-expandable";
import PriceOverlay from "../objekt/price-overlay";
import EditEntryDialog from "./edit-entry-dialog";
import ListOverlay from "./list-overlay";

type Props = {
  item: ObjektListItem;
  id: string;
  priority: boolean;
  authenticated: boolean;
  objektList: ObjektList;
  fxRateToUsd: number | null;
};

export function ListGridItem({
  item,
  priority,
  authenticated,
  objektList,
  fxRateToUsd,
}: Props) {
  const collection = useMemo(() => Objekt.fromIndexer(item), [item]);
  const currency = objektList.type === "sale" ? objektList.currency : null;
  const [editOpen, setEditOpen] = useState(false);
  const [listingsOpen, setListingsOpen] = useState(false);
  // a sale list card edits its entry for the owner and shows every seller's
  // listing of the collection to anyone else, instead of opening metadata
  const editable = currency !== null && authenticated;

  return (
    <>
      <ExpandableObjekt
        collection={collection}
        priority={priority}
        onClick={
          editable
            ? () => setEditOpen(true)
            : currency
              ? () => setListingsOpen(true)
              : undefined
        }
      >
        <ObjektSidebar
          collection={collection}
          serial={item.entrySerial ?? undefined}
        />
        {authenticated && (
          <ListOverlay
            id={item.id}
            collection={collection}
            objektList={objektList}
            onViewListings={currency ? () => setListingsOpen(true) : undefined}
          />
        )}
        {currency && (
          <SalePriceOverlay
            collection={collection}
            price={item.entryPrice ?? 0}
            currency={currency}
            rateToUsd={fxRateToUsd}
          />
        )}
      </ExpandableObjekt>

      {currency && (
        <ListingsDialog
          collection={collection}
          open={listingsOpen}
          onOpenChange={setListingsOpen}
          pinnedEntryId={item.id}
        />
      )}

      {currency && editable && (
        <EditEntryDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          objektListId={objektList.id}
          objektListEntryId={item.id}
          tokenId={item.entryTokenId}
          quantity={item.entryQuantity}
          price={item.entryPrice}
          currency={currency}
          collectionId={collection.collectionId}
        />
      )}
    </>
  );
}

type SalePriceOverlayProps = {
  collection: Objekt.Collection;
  price: number;
  currency: string;
  rateToUsd: number | null;
};

/**
 * The entry price in the viewer's currency, with the seller's original price
 * above it when the two differ.
 */
function SalePriceOverlay({
  collection,
  price,
  currency,
  rateToUsd,
}: SalePriceOverlayProps) {
  const viewer = useDisplayCurrency();
  const original = formatPrice(price, currency);

  if (currency === viewer.currency || rateToUsd === null) {
    return <PriceOverlay collection={collection} price={original} />;
  }

  return (
    <PriceOverlay
      collection={collection}
      label={original}
      price={viewer.formatUsd(price * rateToUsd)}
    />
  );
}
