import { useDisplayCurrency } from "@/hooks/use-display-currency";
import { m } from "@/i18n/messages";
import type { ObjektListItem } from "@/lib/functions/objekts/objekt-list";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { formatPrice } from "@/lib/utils";
import type { ObjektList } from "@apollo/database/web/types";
import { IconPlus } from "@tabler/icons-react";
import { memo, useMemo, useState } from "react";
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

export const ListGridItem = memo(function ListGridItem({
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
            price={item.entryPrice}
            currency={currency}
            rateToUsd={fxRateToUsd}
            atFloor={item.entryAtFloor}
            editable={editable}
          />
        )}
      </ExpandableObjekt>

      {currency && (
        <ListingsDialog
          collection={collection}
          open={listingsOpen}
          onOpenChange={setListingsOpen}
          pinnedEntryId={item.entryPrice === null ? undefined : item.id}
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
          rateToUsd={fxRateToUsd}
          slug={collection.slug}
          collectionId={collection.collectionId}
          onViewListings={() => {
            setEditOpen(false);
            setListingsOpen(true);
          }}
        />
      )}
    </>
  );
});

type SalePriceOverlayProps = {
  collection: Objekt.Collection;
  price: number | null;
  currency: string;
  rateToUsd: number | null;
  atFloor: boolean;
  editable: boolean;
};

/**
 * The entry price in the viewer's currency, with the seller's original price
 * above it when the two differ. An unpriced entry prompts the owner to add a
 * price and tells anyone else to ask the seller.
 */
function SalePriceOverlay({
  collection,
  price,
  currency,
  rateToUsd,
  atFloor,
  editable,
}: SalePriceOverlayProps) {
  const viewer = useDisplayCurrency();

  if (price === null) {
    return editable ? (
      <PriceOverlay
        collection={collection}
        price={
          <span className="inline-flex h-6 items-center gap-1 rounded-md border border-dashed border-current/55 bg-black/25 px-2 font-sans text-xxs font-semibold @[180px]:h-7 @[180px]:gap-1.5 @[180px]:px-2.5 @[180px]:text-xs">
            <IconPlus className="size-3" />
            {m.list_sale_add_price()}
          </span>
        }
      />
    ) : (
      <PriceOverlay
        collection={collection}
        label={m.list_sale_no_price()}
        price={<span className="font-sans">{m.list_sale_ask_seller()}</span>}
      />
    );
  }

  const original = formatPrice(price, currency);
  const badge = atFloor && (
    <span className="mb-1 self-start rounded-sm bg-emerald-300 px-1.5 py-0.5 text-[9px] leading-none font-semibold tracking-[0.06em] text-black uppercase @[180px]:text-xxs">
      {m.listings_stat_floor()}
    </span>
  );

  if (currency === viewer.currency || rateToUsd === null) {
    return (
      <PriceOverlay collection={collection} badge={badge} price={original} />
    );
  }

  return (
    <PriceOverlay
      collection={collection}
      badge={badge}
      label={original}
      price={viewer.formatUsd(price * rateToUsd)}
    />
  );
}
