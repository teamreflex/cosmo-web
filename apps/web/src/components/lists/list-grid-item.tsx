import type { ObjektListItem } from "@/lib/functions/objekts/objekt-list";
import { Objekt } from "@/lib/universal/objekt-conversion";
import type { ObjektList } from "@apollo/database/web/types";
import { useMemo, useState } from "react";
import ListingsDialog from "../market/listings-dialog";
import { ObjektSidebar } from "../objekt/common";
import ExpandableObjekt from "../objekt/objekt-expandable";
import EditEntryDialog from "./edit-entry-dialog";
import ListOverlay from "./list-overlay";
import SaleOverlay from "./sale-overlay";

type Props = {
  item: ObjektListItem;
  id: string;
  priority: boolean;
  authenticated: boolean;
  objektList: ObjektList;
};

export function ListGridItem({
  item,
  priority,
  authenticated,
  objektList,
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
          />
        )}
        {currency && (
          <SaleOverlay
            collection={collection}
            price={item.entryPrice}
            currency={currency}
          />
        )}
      </ExpandableObjekt>

      {currency && !editable && (
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
